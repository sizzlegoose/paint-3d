import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function useStroke(meshRef, spacing, onStrokeStart) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const stamps = useRef([])
  const lastPoint = useRef(null)
  const pressed = useRef(false)
  const strokeActive = useRef(false)

  useEffect(() => {
    const el = gl.domElement

    function sample(clientX, clientY) {
      const rect = el.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObject(meshRef.current)[0]

      if (!hit) {
        lastPoint.current = null
        return
      }

      if (pressed.current && !strokeActive.current) {
        strokeActive.current = true
        onStrokeStart()
      }

      const p = meshRef.current.worldToLocal(hit.point.clone())

      const prev = lastPoint.current
      if (prev) {
        const steps = Math.floor(prev.distanceTo(p) / spacing)
        for (let i = 1; i <= steps; i++) {
          stamps.current.push(prev.clone().lerp(p, i / (steps + 1)))
        }
      }

      stamps.current.push(p)
      lastPoint.current = p
    }

    function onDown(e) {
      if (e.button !== 0) return
      el.setPointerCapture(e.pointerId)
      pressed.current = true
      strokeActive.current = false
      lastPoint.current = null
      sample(e.clientX, e.clientY)
    }

    function onMove(e) {
      if (!(e.buttons & 1)) return
      const samples = e.getCoalescedEvents?.() ?? [e]
      for (const s of samples) sample(s.clientX, s.clientY)
    }

    function onUp(e) {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      pressed.current = false
      strokeActive.current = false
      lastPoint.current = null
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
  }, [camera, gl, meshRef, ndc, raycaster, spacing, onStrokeStart])

  return stamps
}
