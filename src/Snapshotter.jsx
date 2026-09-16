import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSnapshot } from './useSnapshot'

const SNAPSHOT_SIZE = 512

export function Snapshotter({ apiRef }) {
  const { gl, scene, camera } = useThree()
  const snapshot = useSnapshot(SNAPSHOT_SIZE)

  useEffect(() => {
    Object.assign(apiRef.current, {
      snapshot: () => snapshot.capture(gl, scene),
    })
  }, [apiRef, snapshot, gl, scene])

  useEffect(() => {
    window.__cameraPose = () => {
      const { x, y, z } = camera.position
      const pose = [+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]
      console.log('[camera] position:', JSON.stringify(pose))
      return pose
    }
  }, [camera])

  return null
}
