import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/fullscreen.vert?raw'
import fragmentShader from './shaders/dilate.frag?raw'

// Pushes painted colour outward into the uncovered gutter around each UV island, so
// texels the mesh samples at an island border are never left unwritten. Alpha is the
// coverage mask: 0 means "outside every triangle", which is what gets filled.
//
// One iteration suffices for NearestFilter -- every samplable-but-unpainted texel on this
// mesh is a direct 8-neighbour of a covered one. LinearFilter reads a 2x2 footprint and
// would want 2.
export function useDilate(size = 128, iterations = 1) {
  return useMemo(() => {
    const options = {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
    }
    const targets = [
      new THREE.WebGLRenderTarget(size, size, options),
      new THREE.WebGLRenderTarget(size, size, options),
    ]

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTex: { value: null },
        uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
      },
      // opaque copy pass -- three maps this to NoBlending, so alpha is written raw
      // rather than composited, which keeps the coverage mask intact
      depthTest: false,
      depthWrite: false,
    })

    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    scene.add(quad)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // pass i writes targets[i % 2], so the result always lands in a known target
    const output = targets[(iterations - 1) % 2]

    function run(gl, sourceTexture) {
      let src = sourceTexture
      for (let i = 0; i < iterations; i++) {
        const dst = targets[i % 2]
        material.uniforms.uTex.value = src
        gl.setRenderTarget(dst)
        gl.render(scene, camera)
        src = dst.texture
      }
      gl.setRenderTarget(null)
    }

    return { targets, material, scene, camera, output, run }
  }, [size, iterations])
}
