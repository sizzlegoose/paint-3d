import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/fullscreen.vert?raw'
import fragmentShader from './shaders/fill.frag?raw'
import { buildSeamLinks } from './seamLinks'

const TOLERANCE = 12 //12

export function useBucketFill(geometry, size) {
  return useMemo(() => {
    if (!geometry) return null

    const links = buildSeamLinks(geometry, size)

    const mask = new Uint8Array(size * size)
    const maskTexture = new THREE.DataTexture(mask, size, size, THREE.RedFormat)
    maskTexture.magFilter = THREE.NearestFilter
    maskTexture.minFilter = THREE.NearestFilter
    maskTexture.unpackAlignment = 1

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uMask: { value: maskTexture },
        uColor: { value: new THREE.Color() },
      },
      depthTest: false,
      depthWrite: false,
    })

    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    scene.add(quad)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const pixels = new Uint8Array(size * size * 4)
    const queue = new Int32Array(size * size)

    function fill(gl, target, uv, color) {
      const x = Math.min(size - 1, Math.max(0, Math.floor(uv.x * size)))
      const y = Math.min(size - 1, Math.max(0, Math.floor(uv.y * size)))
      const seed = y * size + x

      gl.readRenderTargetPixels(target, 0, 0, size, size, pixels)
      if (pixels[seed * 4 + 3] === 0) return 0

      const sr = pixels[seed * 4]
      const sg = pixels[seed * 4 + 1]
      const sb = pixels[seed * 4 + 2]

      function matches(i) {
        if (pixels[i * 4 + 3] === 0) return false
        return (
          Math.abs(pixels[i * 4] - sr) <= TOLERANCE &&
          Math.abs(pixels[i * 4 + 1] - sg) <= TOLERANCE &&
          Math.abs(pixels[i * 4 + 2] - sb) <= TOLERANCE
        )
      }

      mask.fill(0)
      mask[seed] = 255

      let head = 0
      let tail = 0
      queue[tail++] = seed

      while (head < tail) {
        const i = queue[head++]
        const ix = i % size
        const iy = (i / size) | 0

        if (ix > 0) {
          const n = i - 1
          if (!mask[n] && matches(n)) {
            mask[n] = 255
            queue[tail++] = n
          }
        }
        if (ix < size - 1) {
          const n = i + 1
          if (!mask[n] && matches(n)) {
            mask[n] = 255
            queue[tail++] = n
          }
        }
        if (iy > 0) {
          const n = i - size
          if (!mask[n] && matches(n)) {
            mask[n] = 255
            queue[tail++] = n
          }
        }
        if (iy < size - 1) {
          const n = i + size
          if (!mask[n] && matches(n)) {
            mask[n] = 255
            queue[tail++] = n
          }
        }

        const linked = links.get(i)
        if (linked) {
          for (const n of linked) {
            if (!mask[n] && matches(n)) {
              mask[n] = 255
              queue[tail++] = n
            }
          }
        }
      }

      maskTexture.needsUpdate = true
      material.uniforms.uColor.value.set(color)

      const prevAutoClear = gl.autoClear
      gl.autoClear = false
      gl.setRenderTarget(target)
      gl.render(scene, camera)
      gl.setRenderTarget(null)
      gl.autoClear = prevAutoClear

      return tail
    }

    return { fill, links }
  }, [geometry, size])
}
