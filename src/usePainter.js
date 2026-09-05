import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/paint.vert?raw'
import fragmentShader from './shaders/paint.frag?raw'

export function usePainter(geometry, size = 128, radius = 0.15) {
  return useMemo(() => {
    if (!geometry) return null

    const target = new THREE.WebGLRenderTarget(size, size, {
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    })
    // feeds meshStandardMaterial.map, which expects sRGB; default is NoColorSpace
    target.texture.colorSpace = THREE.SRGBColorSpace

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBrushPos: { value: new THREE.Vector3(0, 0, 1) },
        uRadius: { value: radius },
        uColor: { value: new THREE.Color('#ff0000') },
      },
      // alpha out of the fragment shader is the brush mask; NormalBlending composites
      // each stamp over what previous stamps already wrote
      transparent: true,
      blending: THREE.NormalBlending,
      // UV winding is unrelated to 3D winding. glTF stores UVs V-down, so uv*2-1
      // mirrors the layout into NDC and reverses every triangle -- with the default
      // FrontSide every face is back-facing and culled before rasterization.
      side: THREE.DoubleSide,
      // every vertex sits at z=0; depth testing has nothing to order here
      depthTest: false,
      depthWrite: false,
    })

    const scene = new THREE.Scene()
    const mesh = new THREE.Mesh(geometry, material)
    // the vertex shader ignores projectionMatrix/modelViewMatrix, so a frustum test
    // against the ortho camera measures a projection that is never applied
    mesh.frustumCulled = false
    scene.add(mesh)
    // required by gl.render(); has no effect on output
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    return { target, material, scene, camera }
  }, [geometry, size, radius])
}