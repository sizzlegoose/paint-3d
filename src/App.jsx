import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { Model } from './PaintTarget'
import { Toolbar } from './Toolbar'
import { TOOLS } from './tools'
import { ACTIONS } from './actions'

export default function App() {
  const [toolId, setToolId] = useState(TOOLS[0].id)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const historyRef = useRef({})
  const tool = TOOLS.find((t) => t.id === toolId)

  function runAction(id) {
    historyRef.current[id]?.()
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Toolbar
        tools={TOOLS}
        activeId={toolId}
        onSelect={setToolId}
        actions={ACTIONS}
        onAction={runAction}
        disabled={{ undo: !history.canUndo, redo: !history.canRedo }}
      />

      <Canvas
        style={{ height: '100vh', flex: 1, minWidth: 0 }}
        camera={{ position: [0, 0, 3] }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} />
        <Suspense fallback={null}>
          <Model tool={tool} historyRef={historyRef} onHistoryChange={setHistory} />
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
    </div>
  )
}
