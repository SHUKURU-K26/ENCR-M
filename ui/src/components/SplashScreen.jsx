import { useState, useEffect } from 'react'
import Logo from './Logo'

export default function SplashScreen({ children, forceDark = true }) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading]   = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1800)
    const hideTimer = setTimeout(() => setVisible(false), 2300)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  const bg   = forceDark ? 'bg-encr-950' : 'bg-encr-50 dark:bg-encr-950'
  const text = forceDark ? 'text-white' : 'text-encr-900 dark:text-white'

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 ${bg} transition-opacity duration-500 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div
        className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-glow"
        style={{ animation: 'brandPulse 0.9s ease-in-out 2' }}
      >
        <Logo size={40} className="text-white" />
      </div>
      <div className={`font-display text-2xl font-bold tracking-tight ${text}`}>
        {children}
      </div>
    </div>
  )
}