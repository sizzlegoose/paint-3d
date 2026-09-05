/* eslint-disable react-hooks/immutability -- gl.autoClear must be toggled to accumulate
   strokes; gl is an external renderer handle, not React state */
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef, useEffect } from 'react'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { usePaintCanvas } from './usePaintCanvas'
import { UVPreview } from './UVPreview'
import { usePainter } from './usePainter'
import { useDilate } from './useDilate'

const SIZE = 512
const RADIUS = 0.05

function PaintTarget({ geometry, texture }) {

  const { camera, gl } = useThree()
  const meshRef = useRef()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const stamps = useRef([])
  const lastPoint = useRef(null)
  const needsDilate = useRef(false)
  const painter = usePainter(geometry, SIZE, RADIUS)
  const dilate = useDilate(SIZE)


  useEffect(() => {
    if (!painter) return

    const prevColor = new THREE.Color()
    gl.getClearColor(prevColor)
    const prevAlpha = gl.getClearAlpha()

    gl.setClearColor(0xffffff, 0)

    gl.setRenderTarget(painter.target)
    gl.clear()
    gl.render(painter.baseScene, painter.camera)
    gl.setRenderTarget(null)

    gl.setClearColor(prevColor, prevAlpha)

    needsDilate.current = true
  }, [painter, gl])


  useFrame(() => {
    if (!painter) return

    if (stamps.current.length > 0) {
      const prevAutoClear = gl.autoClear
      gl.autoClear = false

      gl.setRenderTarget(painter.target)
      for (const p of stamps.current) {
        painter.material.uniforms.uBrushPos.value.copy(p)
        gl.render(painter.scene, painter.camera)
      }
      gl.setRenderTarget(null)

      gl.autoClear = prevAutoClear
      stamps.current.length = 0
      needsDilate.current = true
    }

    if (needsDilate.current) {
      dilate.run(gl, painter.target.texture)
      needsDilate.current = false
    }
  })

  // debug helper: call __probePaint() from the console
  useEffect(() => {
    if (!painter) return
    const count = (rt) => {
      const buf = new Uint8Array(SIZE * SIZE * 4)
      gl.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf)
      let n = 0
      for (let i = 3; i < buf.length; i += 4) if (buf[i] > 0) n++
      return n
    }
    window.__probePaint = () => {
      const covered = count(painter.target)
      const dilated = count(dilate.output)
      console.log(`[probe] coverage: ${covered} / ${SIZE * SIZE} | after dilation: ${dilated}`)
      return { covered, dilated }
    }
  }, [painter, gl, dilate])

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

      const p = meshRef.current.worldToLocal(hit.point.clone())

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
      <meshStandardMaterial map={painter ? dilate.output.texture : texture} />
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