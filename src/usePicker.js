import { useCallback, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function usePicker(meshRef) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  return useCallback(
    (clientX, clientY) => {
      if (!meshRef.current) return null

      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      )

      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObject(meshRef.current)[0] ?? null
    },
    [camera, gl, meshRef, raycaster]
  )
}
