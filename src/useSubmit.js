import { useCallback } from 'react'

export function useSubmit() {
  return useCallback(() => {
    console.log('submit button pressed')
  }, [])
}
