import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/paint.vert?raw'
import fragmentShader from './shaders/paint.frag?raw'
import baseFragmentShader from './shaders/base.frag?raw'

export function usePainter(geometry, size = 128, radius = 0.15) {
  return useMemo(() => {
    if (!geometry) return null

    const target = new THREE.WebGLRenderTarget(size, size, {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
    })

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBrushPos: { value: new THREE.Vector3(0, 0, 1) },
        uRadius: { value: radius },
        uColor: { value: new THREE.Color('#ff0000') },
      },
      
      transparent: true,
      blending: THREE.NormalBlending,
     
      side: THREE.DoubleSide,
      
      depthTest: false,
      depthWrite: false,
    })

    const baseMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: baseFragmentShader,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    })

    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(geometry, material)

    mesh.frustumCulled = false
    scene.add(mesh)

    const baseScene = new THREE.Scene()
    const baseMesh = new THREE.Mesh(geometry, baseMaterial)

    baseMesh.frustumCulled = false
    baseScene.add(baseMesh)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    return { target, material, baseMaterial, scene, baseScene, camera }
  }, [geometry, size, radius])
}