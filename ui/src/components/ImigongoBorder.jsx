export default function ImigongoBorder({ height = 8, className = '' }) {
  const ink = '#1c1a17'
  const clay = '#7a2e2e'
  const bone = '#eef0e6'
  const w = height * 2
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">` +
    `<rect width="${w}" height="${height}" fill="${bone}"/>` +
    `<polygon points="0,${height} ${w / 4},0 ${w / 2},${height}" fill="${ink}"/>` +
    `<polygon points="${w / 2},${height} ${w * 3 / 4},0 ${w},${height}" fill="${clay}"/>` +
    `</svg>`
  )
  return (
    <div
      className={className}
      style={{
        height: `${height}px`,
        width: '100%',
        flexShrink: 0,
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${w}px ${height}px`,
      }}
    />
  )
}