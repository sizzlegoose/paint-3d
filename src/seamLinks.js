const QUANT = 1e4
const UV_EPSILON = 1e-5
const INWARD_TEXELS = 1.5

function positionKey(pos, i) {
  const x = Math.round(pos[i * 3] * QUANT)
  const y = Math.round(pos[i * 3 + 1] * QUANT)
  const z = Math.round(pos[i * 3 + 2] * QUANT)
  return `${x},${y},${z}`
}

function sameUv(uvs, a, b) {
  return (
    Math.abs(uvs[a * 2] - uvs[b * 2]) < UV_EPSILON &&
    Math.abs(uvs[a * 2 + 1] - uvs[b * 2 + 1]) < UV_EPSILON
  )
}

function texelAt(uvs, side, t, size) {
  const ax = uvs[side.start * 2]
  const ay = uvs[side.start * 2 + 1]
  const bx = uvs[side.end * 2]
  const by = uvs[side.end * 2 + 1]
  const cx = uvs[side.opposite * 2]
  const cy = uvs[side.opposite * 2 + 1]

  let px = ax + (bx - ax) * t
  let py = ay + (by - ay) * t

  const dx = cx - px
  const dy = cy - py
  const length = Math.hypot(dx, dy)
  if (length > 0) {
    const nudge = INWARD_TEXELS / size
    px += (dx / length) * nudge
    py += (dy / length) * nudge
  }

  const x = Math.floor(px * size)
  const y = Math.floor(py * size)
  if (x < 0 || x >= size || y < 0 || y >= size) return -1
  return y * size + x
}

function texelLength(uvs, side, size) {
  const dx = (uvs[side.end * 2] - uvs[side.start * 2]) * size
  const dy = (uvs[side.end * 2 + 1] - uvs[side.start * 2 + 1]) * size
  return Math.hypot(dx, dy)
}

function addLink(links, from, to) {
  let list = links.get(from)
  if (!list) {
    list = []
    links.set(from, list)
  }
  if (!list.includes(to)) list.push(to)
}

export function buildSeamLinks(geometry, size) {
  const links = new Map()

  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  if (!position || !uv) return links

  const pos = position.array
  const uvs = uv.array
  const index = geometry.index ? geometry.index.array : null
  const count = index ? index.length : position.count
  const vertexAt = (i) => (index ? index[i] : i)

  const edges = new Map()

  for (let t = 0; t < count; t += 3) {
    const v = [vertexAt(t), vertexAt(t + 1), vertexAt(t + 2)]

    for (let e = 0; e < 3; e++) {
      const a = v[e]
      const b = v[(e + 1) % 3]
      const opposite = v[(e + 2) % 3]

      const ka = positionKey(pos, a)
      const kb = positionKey(pos, b)
      if (ka === kb) continue

      const flipped = ka > kb
      const key = flipped ? `${kb}|${ka}` : `${ka}|${kb}`
      const side = {
        start: flipped ? b : a,
        end: flipped ? a : b,
        opposite,
      }

      if (!edges.has(key)) edges.set(key, [])
      edges.get(key).push(side)
    }
  }

  for (const sides of edges.values()) {
    if (sides.length !== 2) continue

    const [a, b] = sides
    if (sameUv(uvs, a.start, b.start) && sameUv(uvs, a.end, b.end)) continue

    const steps = Math.max(
      2,
      Math.ceil(Math.max(texelLength(uvs, a, size), texelLength(uvs, b, size)) * 2)
    )

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const ia = texelAt(uvs, a, t, size)
      const ib = texelAt(uvs, b, t, size)
      if (ia < 0 || ib < 0 || ia === ib) continue
      addLink(links, ia, ib)
      addLink(links, ib, ia)
    }
  }

  return links
}
