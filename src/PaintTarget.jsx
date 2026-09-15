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
import { usePicker } from './usePicker'
import { useBucketFill } from './useBucketFill'
import { BrushCursor } from './BrushCursor'

const SIZE = 512

function PaintTarget({ geometry, tool, color, radius, apiRef, onHistoryChange }) {
  const { gl } = useThree()
  const meshRef = useRef()
  const needsDilate = useRef(false)
  const painter = usePainter(geometry, SIZE)
  const dilate = useDilate(SIZE)
  const history = useHistory(SIZE)
  const pick = usePicker(meshRef)
  const bucket = useBucketFill(geometry, SIZE)
  const clickMode = tool.mode === 'click'

  const report = useCallback(() => {
    onHistoryChange({ canUndo: history.canUndo, canRedo: history.canRedo })
  }, [history, onHistoryChange])

  const handleStrokeStart = useCallback(() => {
    if (!painter) return
    history.capture(gl, painter.target)
    report()
  }, [history, gl, painter, report])

  const resetToBase = useCallback(() => {
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
  }, [gl, painter])

  const stamps = useStroke(meshRef, pick, radius * 0.25, handleStrokeStart, !clickMode)

  useEffect(() => {
    if (!painter || !bucket || !clickMode) return

    const el = gl.domElement

    function onDown(e) {
      if (e.button !== 0) return

      const hit = pick(e.clientX, e.clientY)
      if (!hit || !hit.uv) return

      history.capture(gl, painter.target)
      bucket.fill(gl, painter.target, hit.uv, tool.color ?? color)
      needsDilate.current = true
      report()
    }

    el.addEventListener('pointerdown', onDown)
    return () => el.removeEventListener('pointerdown', onDown)
  }, [gl, pick, painter, bucket, clickMode, history, report, tool, color])

  useEffect(() => {
    if (!painter) return

    apiRef.current = {
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
      clear: () => {
        history.capture(gl, painter.target)
        resetToBase()
        report()
      },
    }
  }, [apiRef, history, gl, painter, report, resetToBase])

  useEffect(() => {
    resetToBase()
  }, [resetToBase])

  useFrame(() => {
    if (!painter) return

    if (stamps.current.length > 0) {
      const prevAutoClear = gl.autoClear
      gl.autoClear = false

      painter.material.uniforms.uColor.value.set(tool.color ?? color)
      painter.material.uniforms.uRadius.value = radius

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
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial map={dilate.output.texture} />
      </mesh>

      <BrushCursor pick={pick} radius={radius} enabled={!clickMode} />
    </>
  )
}

export function Model({ tool, color, radius, apiRef, onHistoryChange }) {
  const { nodes } = useGLTF('/models/icosphere.glb')
  return (
    <PaintTarget
      geometry={nodes.Icosphere.geometry}
      tool={tool}
      color={color}
      radius={radius}
      apiRef={apiRef}
      onHistoryChange={onHistoryChange}
    />
  )
}
