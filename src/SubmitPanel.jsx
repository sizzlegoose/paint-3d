import { useEffect } from 'react'
import styles from './SubmitPanel.module.css'

export function SubmitPanel({ image, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Submission">
      <button className={styles.close} onClick={onClose} aria-label="Close">
        ×
      </button>

      {image ? (
        <img className={styles.image} src={image} alt="Submitted model" />
      ) : (
        <p className={styles.message}>No image captured</p>
      )}
    </div>
  )
}
