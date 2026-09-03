import { Canvas, useThree } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const SIZE = 128


function PaintTarget() {

  const { camera, gl } = useThree()
  const meshRef = useRef()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  const { texture, ctx } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, SIZE, SIZE)

    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    return { texture, ctx }
  }, [])

  const lastUV = useRef(null)

  function strokeTo(uv) {
    const x = uv.x * SIZE
    const y = (1 - uv.y) * SIZE

    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'

    ctx.beginPath()
    if (lastUV.current) {
      ctx.moveTo(lastUV.current.x * SIZE, (1 - lastUV.current.y) * SIZE)
    } else {
      ctx.moveTo(x, y)
    }
    ctx.lineTo(x, y)
    ctx.stroke()

    lastUV.current = { x: uv.x, y: uv.y }
    texture.needsUpdate = true
  }

  useEffect(() => {
    const el = gl.domElement

    function sample(clientX, clientY) {
      const rect = el.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObject(meshRef.current)[0]

      if (hit) strokeTo(hit.uv)
      else lastUV.current = null

    }

    function onDown(e) {
      if (e.button !== 0) return
      el.setPointerCapture(e.pointerId)
      lastUV.current = null
      sample(e.clientX, e.clientY)
    }
    
    function onMove(e) {
      if (!(e.buttons & 1)) return
      const samples = e.getCoalescedEvents?.() ?? [e]
      console.log(samples.length)
      for (const s of samples) sample(s.clientX, s.clientY)
    }

    function onUp(e) {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      lastUV.current = null
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
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas style={{ height: '100vh' }} camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} />
      <PaintTarget />
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
  )
}