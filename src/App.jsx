import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const SIZE = 128


function PaintTarget() {
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

  function paint(uv) {
    const x = uv.x * SIZE
    const y = (1 - uv.y) * SIZE

    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    texture.needsUpdate = true
  }

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

  return (
    <mesh
      onPointerDown={(e) => { if (e.button === 0) { lastUV.current = null; strokeTo(e.uv) } }}
      onPointerMove={(e) => { if (e.buttons & 1) strokeTo(e.uv) }}
      onPointerUp={() => { lastUV.current = null }}
    >
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