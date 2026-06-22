export default function AgasekeBasket({ size = 64, className = '' }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 100 150" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 40 L90 40 L50 8 Z" fill="#d4b483" />
      <circle cx="50" cy="8" r="4" fill="#1c1a17" />
      <rect x="10" y="40" width="80" height="92" rx="16" fill="#e8d2a6" />
      <line x1="14" y1="50" x2="86" y2="50" stroke="#c9a06e" strokeWidth="1" />
      <line x1="14" y1="57" x2="86" y2="57" stroke="#c9a06e" strokeWidth="1" />
      <rect x="10" y="72" width="80" height="24" fill="#7a2e2e" />
      <polyline points="14,84 26,74 38,84 50,74 62,84 74,74 86,84" fill="none" stroke="#1c1a17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="110" x2="86" y2="110" stroke="#c9a06e" strokeWidth="1" />
      <line x1="14" y1="120" x2="86" y2="120" stroke="#c9a06e" strokeWidth="1" />
    </svg>
  )
}