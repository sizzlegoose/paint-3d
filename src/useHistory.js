import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/fullscreen.vert?raw'
import fragmentShader from './shaders/copy.frag?raw'

export function useHistory(size, limit = 20) {
  return useMemo(() => {
    const options = {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
    }

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTex: { value: null },
      },
      depthTest: false,
      depthWrite: false,
    })

    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    scene.add(quad)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const undoStack = []
    const redoStack = []

    function blit(gl, sourceTexture, destination) {
      material.uniforms.uTex.value = sourceTexture
      gl.setRenderTarget(destination)
      gl.render(scene, camera)
      gl.setRenderTarget(null)
    }

    function snapshot(gl, sourceTexture) {
      const target = new THREE.WebGLRenderTarget(size, size, options)
      blit(gl, sourceTexture, target)
      return target
    }

    function discard(stack) {
      for (const target of stack) target.dispose()
      stack.length = 0
    }

    return {
      capture(gl, target) {
        undoStack.push(snapshot(gl, target.texture))
        while (undoStack.length > limit) undoStack.shift().dispose()
        discard(redoStack)
      },

      undo(gl, target) {
        if (undoStack.length === 0) return false
        redoStack.push(snapshot(gl, target.texture))
        const previous = undoStack.pop()
        blit(gl, previous.texture, target)
        previous.dispose()
        return true
      },

      redo(gl, target) {
        if (redoStack.length === 0) return false
        undoStack.push(snapshot(gl, target.texture))
        const next = redoStack.pop()
        blit(gl, next.texture, target)
        next.dispose()
        return true
      },

      get canUndo() {
        return undoStack.length > 0
      },

      get canRedo() {
        return redoStack.length > 0
      },
    }
  }, [size, limit])
}
