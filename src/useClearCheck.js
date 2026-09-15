import { useMemo } from 'react'

export function useClearCheck(size) {
  return useMemo(() => {
    const base = new Uint8Array(size * size * 4)
    const current = new Uint8Array(size * size * 4)
    const baseWords = new Uint32Array(base.buffer)
    const currentWords = new Uint32Array(current.buffer)
    const state = { hasBase: false }

    return {
      rememberBase(gl, target) {
        gl.readRenderTargetPixels(target, 0, 0, size, size, base)
        state.hasBase = true
      },

      isClear(gl, target) {
        if (!state.hasBase) return false

        gl.readRenderTargetPixels(target, 0, 0, size, size, current)
        for (let i = 0; i < baseWords.length; i++) {
          if (baseWords[i] !== currentWords[i]) return false
        }
        return true
      },
    }
  }, [size])
}
