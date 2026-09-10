/* eslint-disable react-hooks/immutability -- gl.autoClear must be toggled to accumulate
   strokes; gl is an external renderer handle, not React state */
import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { usePainter } from './usePainter'
import { useDilate } from './useDilate'
import { useStroke } from './useStroke'
import { useHistory } from './useHistory'

const SIZE = 512
const RADIUS = 0.05

function PaintTarget({ geometry, tool, color, historyRef, onHistoryChange }) {
  const { gl } = useThree()
  const meshRef = useRef()
  const needsDilate = useRef(false)
  const painter = usePainter(geometry, SIZE, RADIUS)
  const dilate = useDilate(SIZE)
  const history = useHistory(SIZE)

  const report = useCallback(() => {
    onHistoryChange({ canUndo: history.canUndo, canRedo: history.canRedo })
  }, [history, onHistoryChange])

  const handleStrokeStart = useCallback(() => {
    if (!painter) return
    history.capture(gl, painter.target)
    report()
  }, [history, gl, painter, report])

  const stamps = useStroke(meshRef, RADIUS * 0.25, handleStrokeStart)

  useEffect(() => {
    if (!painter) return

    historyRef.current = {
      undo: () => {
        if (!history.undo(gl, painter.target)) return
        needsDilate.current = true
        report()
      },
      redo: () => {
        if (!history.redo(gl, painter.target)) return
        needsDilate.current = true
        report()
      },
    }
  }, [historyRef, history, gl, painter, report])

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

      painter.material.uniforms.uColor.value.set(tool.color ?? color)

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

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial map={dilate.output.texture} />
    </mesh>
  )
}

export function Model({ tool, color, historyRef, onHistoryChange }) {
  const { nodes } = useGLTF('/models/icosphere.glb')
  return (
    <PaintTarget
      geometry={nodes.Icosphere.geometry}
      tool={tool}
      color={color}
      historyRef={historyRef}
      onHistoryChange={onHistoryChange}
    />
  )
}
