import { useMemo } from 'react'
import * as THREE from 'three'

const CAMERA_DIRECTION = new THREE.Vector3(1.6, 1.1, 2.2).normalize()
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const FALLBACK_UP = new THREE.Vector3(0, 0, 1)
const FOV = 35
const MARGIN = 1.15
const BACKGROUND = 0x1a1a1a
const QUALITY = 0.85

export function useSnapshot(size = 512) {
  return useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size, size)
    target.texture.colorSpace = THREE.SRGBColorSpace

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)

    const pixels = new Uint8Array(size * size * 4)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const vertex = new THREE.Vector3()
    const center = new THREE.Vector3()

    function eachVertex(scene, visit) {
      scene.traverse((object) => {
        if (!object.isMesh || object.userData.excludeFromSnapshot) return

        const position = object.geometry?.attributes?.position
        if (!position) return

        object.updateWorldMatrix(true, false)

        for (let i = 0; i < position.count; i++) {
          vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld)
          visit(vertex)
        }
      })
    }

    function frame(scene) {
      const reference =
        Math.abs(CAMERA_DIRECTION.dot(WORLD_UP)) > 0.999 ? FALLBACK_UP : WORLD_UP
      right.crossVectors(reference, CAMERA_DIRECTION).normalize()
      up.crossVectors(CAMERA_DIRECTION, right).normalize()

      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      let found = false

      eachVertex(scene, (v) => {
        const x = v.dot(right)
        const y = v.dot(up)
        const z = v.dot(CAMERA_DIRECTION)

        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
        found = true
      })

      if (!found) return false

      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2
      const midZ = (minZ + maxZ) / 2
      const halfDepth = (maxZ - minZ) / 2

      const vHalf = THREE.MathUtils.degToRad(FOV) / 2
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect)
      const tanV = Math.tan(vHalf)
      const tanH = Math.tan(hHalf)

      let distance = 0
      eachVertex(scene, (v) => {
        const z = v.dot(CAMERA_DIRECTION) - midZ
        const x = Math.abs(v.dot(right) - midX)
        const y = Math.abs(v.dot(up) - midY)

        distance = Math.max(distance, z + x / tanH, z + y / tanV)
      })

      distance *= MARGIN

      center
        .set(0, 0, 0)
        .addScaledVector(right, midX)
        .addScaledVector(up, midY)
        .addScaledVector(CAMERA_DIRECTION, midZ)

      camera.position.copy(center).addScaledVector(CAMERA_DIRECTION, distance)
      camera.lookAt(center)

      camera.near = Math.max(distance - halfDepth * 1.5, distance * 0.001)
      camera.far = distance + halfDepth * 1.5
      camera.updateProjectionMatrix()

      return true
    }

    function capture(gl, scene) {
      const hidden = []
      scene.traverse((object) => {
        if (object.userData.excludeFromSnapshot && object.visible) {
          hidden.push(object)
          object.visible = false
        }
      })

      frame(scene)

      const prevColor = new THREE.Color()
      gl.getClearColor(prevColor)
      const prevAlpha = gl.getClearAlpha()

      gl.setClearColor(BACKGROUND, 1)
      gl.setRenderTarget(target)
      gl.render(scene, camera)
      gl.readRenderTargetPixels(target, 0, 0, size, size, pixels)
      gl.setRenderTarget(null)
      gl.setClearColor(prevColor, prevAlpha)

      for (const object of hidden) object.visible = true

      const image = ctx.createImageData(size, size)
      const stride = size * 4
      for (let y = 0; y < size; y++) {
        const from = (size - 1 - y) * stride
        image.data.set(pixels.subarray(from, from + stride), y * stride)
      }
      ctx.putImageData(image, 0, 0)

      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', QUALITY)
      })
    }

    return { capture, camera, size }
  }, [size])
}
