import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef, useEffect } from 'react'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { usePaintCanvas } from './usePaintCanvas'
import { UVPreview } from './UVPreview'
import { usePainter } from './usePainter'

const SIZE = 128
const RADIUS = 0.15

function PaintTarget({ geometry, texture }) {

  const { camera, gl } = useThree()
  const meshRef = useRef()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const stamps = useRef([])
  const lastPoint = useRef(null)
  const painter = usePainter(geometry, SIZE, RADIUS)

  // Prime the target once with an opaque white base. Every later pass runs with
  // autoClear off, so this is the only clear that ever happens.
  useEffect(() => {
    if (!painter) return

    const prevColor = new THREE.Color()
    gl.getClearColor(prevColor)
    const prevAlpha = gl.getClearAlpha()

    gl.setClearColor(0xffffff, 1)
    gl.setRenderTarget(painter.target)
    gl.clear()
    gl.setRenderTarget(null)
    gl.setClearColor(prevColor, prevAlpha)
  }, [painter, gl])

  // Drain the stamp queue into the target once per frame, before R3F renders the
  // scene (priority 0). Batching here is what makes coalesced pointer samples cheap:
  // many stamps, one render-target bind.
  useFrame(() => {
    if (!painter || stamps.current.length === 0) return

    const prevAutoClear = gl.autoClear
    gl.autoClear = false // accumulate -- never wipe what earlier stamps wrote

    gl.setRenderTarget(painter.target)
    for (const p of stamps.current) {
      painter.material.uniforms.uBrushPos.value.copy(p)
      gl.render(painter.scene, painter.camera)
    }
    gl.setRenderTarget(null)

    gl.autoClear = prevAutoClear
    stamps.current.length = 0
  })

  // debug helper: call __probePaint() from the console to count painted texels
  useEffect(() => {
    if (!painter) return
    window.__probePaint = () => {
      const buf = new Uint8Array(SIZE * SIZE * 4)
      gl.readRenderTargetPixels(painter.target, 0, 0, SIZE, SIZE, buf)
      let painted = 0
      for (let i = 0; i < buf.length; i += 4) {
        if (buf[i] !== 255 || buf[i + 1] !== 255 || buf[i + 2] !== 255) painted++
      }
      console.log(`[probe] painted texels: ${painted} / ${SIZE * SIZE}`)
      return painted
    }
  }, [painter, gl])

  useEffect(() => {
    const el = gl.domElement

    function sample(clientX, clientY) {
      const rect = el.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObject(meshRef.current)[0]

      // leaving the mesh breaks the stroke, so the next hit starts a fresh one
      // instead of interpolating across the gap
      if (!hit) {
        lastPoint.current = null
        return
      }

      const p = meshRef.current.worldToLocal(hit.point.clone())

      // Walk from the previous sample to this one so a fast drag paints a stroke
      // rather than a dotted line. The chord through the sphere is a fine stand-in
      // for the surface arc at these step sizes.
      const prev = lastPoint.current
      if (prev) {
        const steps = Math.floor(prev.distanceTo(p) / (RADIUS * 0.25))
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
  }, [camera, gl])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial map={painter ? painter.target.texture : texture} />
    </mesh>
  )
}

function Model({ texture }) {
  const { nodes } = useGLTF('/models/icosphere.glb')
  return <PaintTarget geometry={nodes.Icosphere.geometry} texture={texture} />
}

export default function App() {
  const { texture, canvas } = usePaintCanvas(SIZE)

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Canvas style={{ height: '100vh' }} camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} />
        <Suspense fallback={null}>
          <Model texture={texture} />
        </Suspense>
        <OrbitControls
          mouseButtons={{
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
          touches={{
            ONE: null,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
          }}
        />
      </Canvas>

      <UVPreview canvas={canvas} />
    </div>

  )
}