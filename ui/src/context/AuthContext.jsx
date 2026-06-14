import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthCtx = createContext(null)

const IDLE_MS = 20 * 60 * 1000   // 20 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('encr_user')) } catch { return null }
  })
  const timerRef = useRef(null)

  const logout = useCallback(() => {
    localStorage.removeItem('encr_token')
    localStorage.removeItem('encr_user')
    setUser(null)
    clearTimeout(timerRef.current)
  }, [])

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    if (user) timerRef.current = setTimeout(logout, IDLE_MS)
  }, [user, logout])

  // Reset idle timer on any user interaction
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  const login = (userData, token) => {
    localStorage.setItem('encr_token', token)
    localStorage.setItem('encr_user', JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)