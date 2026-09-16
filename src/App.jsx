import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { Model } from './PaintTarget'
import { Toolbar } from './Toolbar'
import { TOOLS } from './tools'
import { ACTIONS } from './actions'
import { useSubmit } from './useSubmit'
import { SubmitPanel } from './SubmitPanel'
import { Snapshotter } from './Snapshotter'
import { AliasFilter } from './AliasFilter'
import styles from './App.module.css'

const MIN_RADIUS = 0.005
const MAX_RADIUS = 0.5

export default function App() {
  const [toolId, setToolId] = useState(TOOLS[0].id)
  const [color, setColor] = useState('#ff0000')
  const [size, setSize] = useState('0.05')
  const [status, setStatus] = useState({
    canUndo: false,
    canRedo: false,
    canClear: false,
  })
  const apiRef = useRef({})
  const tool = TOOLS.find((t) => t.id === toolId)
  const { isOpen, image, submit, close } = useSubmit(apiRef)

  const parsed = Number(size)
  const radius = Number.isFinite(parsed)
    ? Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, parsed))
    : MIN_RADIUS

  function runAction(id) {
    if (id === 'submit') return submit()
    apiRef.current[id]?.()
  }

  return (
    <>
      <AliasFilter />

      <div
        className={isOpen ? `${styles.app} ${styles.dimmed}` : styles.app}
        inert={isOpen}
      >
        <Toolbar
          tools={TOOLS}
          activeId={toolId}
          onSelect={setToolId}
          actions={ACTIONS}
          onAction={runAction}
          disabled={{
            undo: !status.canUndo,
            redo: !status.canRedo,
            clear: !status.canClear,
          }}
          color={color}
          onColorChange={setColor}
          colorEnabled={tool.color === undefined}
          size={size}
          onSizeChange={setSize}
          sizeEnabled={tool.mode === 'stroke'}
        />

        <Canvas
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [0, 0, 3] }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} />
          <Suspense fallback={null}>
            <Model
              tool={tool}
              color={color}
              radius={radius}
              apiRef={apiRef}
              onStatusChange={setStatus}
            />
          </Suspense>
          <Snapshotter apiRef={apiRef} />
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
      </div>

      {isOpen && <SubmitPanel image={image} onClose={close} />}
    </>
  )
}
