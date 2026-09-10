function buttonStyle({ active = false, disabled = false } = {}) {
  return {
    padding: '8px 16px',
    font: 'inherit',
    textAlign: 'left',
    borderRadius: 4,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    color: active ? '#fff' : '#aaa',
    background: active ? '#333' : 'transparent',
    border: `1px solid ${active ? '#888' : '#444'}`,
  }
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
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        background: '#1a1a1a',
        flexShrink: 0,
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          style={buttonStyle({ active: tool.id === activeId })}
        >
          {tool.label}
        </button>
      ))}

      <div style={{ height: 1, background: '#444', margin: '4px 0' }} />

      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={disabled[action.id]}
          style={buttonStyle({ disabled: disabled[action.id] })}
        >
          {action.label}
        </button>
      ))}

      <div style={{ height: 1, background: '#444', margin: '4px 0' }} />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 4px',
          color: '#aaa',
          font: 'inherit',
          opacity: colorEnabled ? 1 : 0.4,
        }}
      >
        <input
          type="color"
          value={color}
          disabled={!colorEnabled}
          onChange={(e) => onColorChange(e.target.value)}
          style={{
            width: 32,
            height: 32,
            padding: 0,
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: 4,
            cursor: colorEnabled ? 'pointer' : 'default',
          }}
        />
        Color
      </label>
    </div>
  )
}
