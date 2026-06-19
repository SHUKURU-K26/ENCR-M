export default function Logo({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.4 L20.2 7.2 L20.2 16.8 L12 21.6 L3.8 16.8 L3.8 7.2 Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="7.2" y="10.1" width="9.6" height="1.6" rx="0.8" fill="currentColor" />
      <rect x="7.2" y="13.3" width="6" height="1.6" rx="0.8" fill="currentColor" />
      <rect x="7.2" y="16.5" width="7.8" height="1.6" rx="0.8" fill="currentColor" />
    </svg>
  )
}