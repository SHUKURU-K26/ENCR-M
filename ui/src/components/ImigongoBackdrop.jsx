export default function ImigongoBackdrop({ className = '' }) {
  const tile = 90
  const lightSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">` +
    `<polygon points="0,${tile} ${tile / 2},0 ${tile},${tile}" fill="#3b56a8"/>` +
    `</svg>`
  )
  const darkSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">` +
    `<polygon points="0,${tile} ${tile / 2},0 ${tile},${tile}" fill="#5b79d4"/>` +
    `</svg>`
  )
  const base = { backgroundRepeat: 'repeat', backgroundSize: `${tile}px ${tile}px` }
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 block dark:hidden ${className}`}
        style={{ ...base, backgroundImage: `url("data:image/svg+xml,${lightSvg}")`, opacity: 0.08 }}
      />
      <div
        className={`pointer-events-none absolute inset-0 hidden dark:block ${className}`}
        style={{ ...base, backgroundImage: `url("data:image/svg+xml,${darkSvg}")`, opacity: 0.12 }}
      />
    </>
  )
}