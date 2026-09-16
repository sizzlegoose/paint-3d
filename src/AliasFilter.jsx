export function AliasFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden' }}
    >
      <filter id="aliased" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncA type="discrete" tableValues="0 1" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}
