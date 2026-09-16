import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FORWARD = new THREE.Vector3(0, 0, 1)
const SURFACE_OFFSET = 0.002

export function BrushCursor({ pick, radius, enabled }) {
  const { gl } = useThree()
  const ringRef = useRef()
  const pointer = useRef(null)
  const normal = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!enabled) return

    const el = gl.domElement

    function onMove(e) {
      pointer.current = { x: e.clientX, y: e.clientY }
    }

    function onLeave() {
      pointer.current = null
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [gl, enabled])

  useFrame(() => {
    const ring = ringRef.current
    if (!ring) return

    if (!enabled || !pointer.current) {
      ring.visible = false
      return
    }

    const hit = pick(pointer.current.x, pointer.current.y)
    if (!hit || !hit.face) {
      ring.visible = false
      return
    }

    normal.current.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)

    ring.position.copy(hit.point).addScaledVector(normal.current, SURFACE_OFFSET)
    ring.quaternion.setFromUnitVectors(FORWARD, normal.current)
    ring.scale.setScalar(radius)
    ring.visible = true
  })

  return (
    <mesh
      ref={ringRef}
      visible={false}
      frustumCulled={false}
      userData={{ excludeFromSnapshot: true }}
    >
      <ringGeometry args={[0.94, 1, 48]} />
      <meshBasicMaterial
        color="#ffffff"
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
