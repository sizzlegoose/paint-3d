import { useRef, useEffect } from 'react'

const PREVIEW = 256

export function UVPreview({ canvas }) {
  const holder = useRef()

  useEffect(() => {
    canvas.style.width = `${PREVIEW}px`
    canvas.style.height = `${PREVIEW}px`
    canvas.style.imageRendering = 'pixelated'
    canvas.style.display = 'block'
    holder.current.appendChild(canvas)
  }, [canvas])

  return (
    <div style={{ padding: 12, background: '#1a1a1a' }}>
      <div ref={holder} style={{ width: PREVIEW, height: PREVIEW, border: '1px solid #444' }} />
    </div>
  )
}