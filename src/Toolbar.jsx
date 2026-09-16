import styles from './Toolbar.module.css'

const MAX_TILT = 30

function tilt(event) {
  const el = event.currentTarget
  if (el.disabled) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const rect = el.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height

  el.style.setProperty('--rx', `${(py - 0.5) * 2 * MAX_TILT}deg`)
  el.style.setProperty('--ry', `${(0.5 - px) * 2 * MAX_TILT}deg`)
}

function resetTilt(event) {
  const el = event.currentTarget
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

const PRESS_FRAMES = [
  { transform: 'scale(1, 1) skewX(0deg) rotate(0deg)' },
  { transform: 'scale(1.28, 0.62) skewX(0deg) rotate(0deg)', offset: 0.18 },
  { transform: 'scale(0.74, 1.34) skewX(-9deg) rotate(0deg)', offset: 0.44 },
  { transform: 'scale(1.12, 0.9) skewX(3deg) rotate(2deg)', offset: 0.68 },
  { transform: 'scale(1, 1) skewX(0deg) rotate(0deg)' },
]

const PRESS_TIMING = {
  duration: 380,
  easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  composite: 'add',
}

function press(event) {
  const el = event.currentTarget
  if (el.disabled) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  el.animate(PRESS_FRAMES, PRESS_TIMING)
}

function rowClass(enabled) {
  return enabled ? styles.settingRow : `${styles.settingRow} ${styles.settingRowDisabled}`
}

export function Toolbar({
  tools,
  activeId,
  onSelect,
  actions,
  onAction,
  disabled,
  color,
  onColorChange,
  colorEnabled,
  size,
  onSizeChange,
  sizeEnabled,
}) {
  return (
    <div className={styles.panel}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          onPointerMove={tilt}
          onPointerLeave={resetTilt}
          onPointerDown={press}
          style={{ '--accent': tool.accent }}
          className={
            tool.id === activeId
              ? `${styles.button} ${styles.tool} ${styles.isActive}`
              : `${styles.button} ${styles.tool}`
          }
        >
          {tool.label}
        </button>
      ))}

      <div className={styles.separator} />

      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          onPointerMove={tilt}
          onPointerLeave={resetTilt}
          onPointerDown={press}
          disabled={disabled[action.id]}
          style={{ '--accent': action.accent }}
          className={styles.button}
        >
          {action.label}
        </button>
      ))}

      <div className={styles.separator} />

      <label className={rowClass(colorEnabled)}>
        <input
          type="color"
          value={color}
          disabled={!colorEnabled}
          onChange={(e) => onColorChange(e.target.value)}
          className={styles.swatch}
        />
        Color
      </label>

      <label className={rowClass(sizeEnabled)}>
        <input
          type="number"
          value={size}
          disabled={!sizeEnabled}
          min="0.005"
          max="0.5"
          step="0.01"
          onChange={(e) => onSizeChange(e.target.value)}
          className={styles.numberInput}
        />
      </label>
    </div>
  )
}
