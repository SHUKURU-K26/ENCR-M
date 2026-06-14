import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const listeners = new Set()

export function useSocket(onMessage) {
  const { user } = useAuth()
  const wsRef  = useRef(null)
  const cbRef  = useRef(onMessage)
  cbRef.current = onMessage

  // Global send function
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const ws = new WebSocket(`${WS_URL}/ws/${user.user_id}`)
    wsRef.current = ws

    ws.onopen = () => {
      // store ws globally so any component can send
      window.__encrSocket = ws
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        // fire all registered listeners
        listeners.forEach(fn => fn(data))
      } catch {}
    }

    ws.onerror = () => {}
    ws.onclose = () => { window.__encrSocket = null }

    return () => {
      ws.close()
      window.__encrSocket = null
    }
  }, [user])

  // Register this component's listener
  useEffect(() => {
    const fn = (data) => cbRef.current(data)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return { send }
}

// Any component can call this to send over the socket
export function socketSend(data) {
  if (window.__encrSocket?.readyState === WebSocket.OPEN) {
    window.__encrSocket.send(JSON.stringify(data))
  }
}