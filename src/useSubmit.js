import { useCallback, useEffect, useRef, useState } from 'react'

export function useSubmit(apiRef) {
  const [isOpen, setIsOpen] = useState(false)
  const [image, setImage] = useState(null)
  const [blob, setBlob] = useState(null)
  const urlRef = useRef(null)

  const submit = useCallback(async () => {
    const captured = await apiRef.current.snapshot?.()

    if (captured) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(captured)
      setImage(urlRef.current)
      setBlob(captured)
    }

    setIsOpen(true)
  }, [apiRef])

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  return { isOpen, image, blob, submit, close }
}
