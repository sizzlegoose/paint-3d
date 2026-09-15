import styles from './Toolbar.module.css'

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
          className={
            tool.id === activeId ? `${styles.button} ${styles.isActive}` : styles.button
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
          disabled={disabled[action.id]}
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
        Size
      </label>
    </div>
  )
}
