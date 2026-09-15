import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'

export function useStroke(meshRef, pick, spacing, onStrokeStart, onStrokeEnd, enabled) {
  const { gl } = useThree()
  const stamps = useRef([])
  const lastPoint = useRef(null)
  const pressed = useRef(false)
  const strokeActive = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const el = gl.domElement

    function sample(clientX, clientY) {
      const hit = pick(clientX, clientY)

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

      const wasActive = strokeActive.current
      pressed.current = false
      strokeActive.current = false
      lastPoint.current = null

      if (wasActive) onStrokeEnd()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
  }, [gl, meshRef, pick, spacing, onStrokeStart, onStrokeEnd, enabled])

  return stamps
}
