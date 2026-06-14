import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Paperclip, Mic, X, Edit2, Reply, StopCircle } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useSocket, socketSend } from '../hooks/useSocket'
import { encryptMessage, decryptMessage, deriveConversationKey, conversationId } from '../utils/crypto'
import MessageBubble from './MessageBubble'
import Avatar from './Avatar'

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-encr-400"
          style={{
            display: 'inline-block',
            animation: `pulseDot 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function ChatWindow({ contact, onClose, onlineUsers }) {
  const { user } = useAuth()
  const convId  = conversationId(user.user_id, contact.id)
  const convKey = deriveConversationKey(user.user_id, contact.id)

  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [editingMsg, setEditingMsg]       = useState(null)
  const [replyTo, setReplyTo]             = useState(null)
  const [contactTyping, setContactTyping] = useState(false)
  const [recording, setRecording]         = useState(false)
  const [mediaRec, setMediaRec]           = useState(null)
  const [uploading, setUploading]         = useState(false)

  const bottomRef   = useRef(null)
  const typingTimer = useRef(null)
  const isTypingRef = useRef(false)
  const fileRef     = useRef(null)
  const audioChunks = useRef([])

  // ── Listen to WebSocket events ────────────────────────────────────────────
  useSocket(useCallback((data) => {
    if (data.type === 'message' && data.payload?.conversation_id === convId) {
      const msg = data.payload
      setMessages(prev => {
        // avoid duplicates
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, {
          ...msg,
          decrypted: msg.type === 'text'
            ? decryptMessage(msg.encrypted_body, msg.iv, convKey)
            : null,
        }]
      })
    }

    if (data.type === 'typing' && data.from === contact.id) {
      setContactTyping(data.is_typing)
      // auto-clear typing after 3s in case stop event is missed
      if (data.is_typing) {
        clearTimeout(typingTimer._clear)
        typingTimer._clear = setTimeout(() => setContactTyping(false), 3000)
      }
    }

    if (data.type === 'edit' && data.payload?.conversation_id === convId) {
      const p = data.payload
      setMessages(prev => prev.map(m =>
        m.id === p.id
          ? { ...m, encrypted_body: p.encrypted_body, iv: p.iv, edited: true,
              decrypted: decryptMessage(p.encrypted_body, p.iv, convKey) }
          : m
      ))
    }

    if (data.type === 'delete' && data.conversation_id === convId) {
      setMessages(prev => prev.map(m =>
        m.id === data.message_id ? { ...m, deleted: true } : m
      ))
    }

    if (data.type === 'read' && data.conversation_id === convId) {
      setMessages(prev => prev.map(m =>
        m.from === user.user_id ? { ...m, read: true } : m
      ))
    }
  }, [convId, contact.id, convKey, user.user_id]))

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/messages/${convId}`).then(({ data }) => {
      setMessages(data.map(m => ({
        ...m,
        decrypted: m.deleted ? null
          : m.type === 'text' ? decryptMessage(m.encrypted_body, m.iv, convKey)
          : null,
      })))
      api.patch(`/messages/${convId}/read`).catch(() => {})
    }).catch(() => {})
  }, [convId, convKey])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, contactTyping])

  // ── Typing indicator ──────────────────────────────────────────────────────
  function handleInputChange(e) {
    setInput(e.target.value)
    if (!isTypingRef.current) {
      isTypingRef.current = true
      socketSend({ type: 'typing', to: contact.id, is_typing: true })
    }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false
      socketSend({ type: 'typing', to: contact.id, is_typing: false })
    }, 1500)
  }

  function stopTyping() {
    clearTimeout(typingTimer.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      socketSend({ type: 'typing', to: contact.id, is_typing: false })
    }
  }

  // ── Send text ─────────────────────────────────────────────────────────────
  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text && !editingMsg) return
    stopTyping()

    if (editingMsg) {
      const { encrypted, iv } = encryptMessage(text, convKey)
      await api.patch(`/messages/${editingMsg.id}`, { encrypted_body: encrypted, iv })
      setMessages(prev => prev.map(m =>
        m.id === editingMsg.id
          ? { ...m, encrypted_body: encrypted, iv, edited: true, decrypted: text }
          : m
      ))
      socketSend({ type: 'edit', to: contact.id, payload: {
        id: editingMsg.id, conversation_id: convId, encrypted_body: encrypted, iv,
      }})
      setEditingMsg(null)
    } else {
      const { encrypted, iv } = encryptMessage(text, convKey)
      const payload = {
        conversation_id: convId, to: contact.id,
        encrypted_body: encrypted, iv, type: 'text',
        reply_to: replyTo?.id || null,
      }
      const { data } = await api.post('/messages/', payload)
      const newMsg = { ...data, decrypted: text }
      setMessages(prev => [...prev, newMsg])
      socketSend({ type: 'message', to: contact.id, payload: newMsg })
      setReplyTo(null)
    }
    setInput('')
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteMessage(id) {
    await api.delete(`/messages/${id}`)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m))
    socketSend({ type: 'delete', to: contact.id, message_id: id, conversation_id: convId })
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data: upload } = await api.post('/media/upload', fd)
      const { encrypted, iv } = encryptMessage(file.name, convKey)
      const payload = {
        conversation_id: convId, to: contact.id,
        encrypted_body: encrypted, iv,
        type: upload.media_type, file_url: upload.url, file_name: file.name,
        reply_to: replyTo?.id || null,
      }
      const { data: msg } = await api.post('/messages/', payload)
      const newMsg = { ...msg, decrypted: file.name }
      setMessages(prev => [...prev, newMsg])
      socketSend({ type: 'message', to: contact.id, payload: newMsg })
      setReplyTo(null)
    } finally { setUploading(false); e.target.value = '' }
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  async function toggleRecording() {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      audioChunks.current = []
      rec.ondataavailable = e => audioChunks.current.push(e.data)
      rec.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' })
        const fd = new FormData(); fd.append('file', file)
        const { data: upload } = await api.post('/media/upload', fd)
        const { encrypted, iv } = encryptMessage('Voice note', convKey)
        const payload = {
          conversation_id: convId, to: contact.id,
          encrypted_body: encrypted, iv, type: 'voice',
          file_url: upload.url, file_name: 'Voice note',
        }
        const { data: msg } = await api.post('/messages/', payload)
        const newMsg = { ...msg, decrypted: 'Voice note' }
        setMessages(prev => [...prev, newMsg])
        socketSend({ type: 'message', to: contact.id, payload: newMsg })
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start()
      setMediaRec(rec)
      setRecording(true)
    } else {
      mediaRec?.stop()
      setRecording(false)
      setMediaRec(null)
    }
  }

  const isOnline = onlineUsers?.has(contact.id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-encr-200 dark:border-encr-800 bg-white/80 dark:bg-encr-900/80 backdrop-blur-sm flex-shrink-0">
        <Avatar name={contact.full_name} color={contact.avatar_color} size="md" online={isOnline}/>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-encr-900 dark:text-encr-100 truncate">{contact.full_name}</div>
          <div className="text-xs text-encr-400 truncate">
            {contactTyping
              ? <span className="text-accent animate-pulse font-medium">typing…</span>
              : isOnline ? '● Online' : '○ Offline'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-lg">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
            <span className="text-[10px] text-green-500 font-medium">E2E Encrypted</span>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-encr-100 dark:hover:bg-encr-800 text-encr-400 transition-colors">
              <X size={16}/>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <div className="font-semibold text-encr-700 dark:text-encr-300 mb-1">Encrypted channel open</div>
            <div className="text-sm text-encr-400">Messages are AES-256 encrypted end-to-end</div>
          </div>
        )}

        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            isOwn={m.from === user.user_id}
            onEdit={setEditingMsg}
            onDelete={deleteMessage}
            onReply={setReplyTo}
            replyMsg={m.reply_to ? messages.find(x => x.id === m.reply_to) : null}
          />
        ))}

        {/* Typing indicator bubble */}
        {contactTyping && (
          <div className="flex justify-start mt-1">
            <div className="msg-bubble-in">
              <TypingDots/>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 bg-white dark:bg-encr-900 border-t border-encr-200 dark:border-encr-800 px-3 py-3">
        {/* Edit / Reply bar */}
        {(editingMsg || replyTo) && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-accent/10 border border-accent/30 text-sm">
            {editingMsg
              ? <Edit2 size={14} className="text-accent flex-shrink-0"/>
              : <Reply size={14} className="text-accent flex-shrink-0"/>}
            <span className="text-encr-700 dark:text-encr-300 truncate flex-1">
              {editingMsg
                ? `Editing: ${editingMsg.decrypted}`
                : `Reply to: ${replyTo.decrypted || 'media'}`}
            </span>
            <button onClick={() => { setEditingMsg(null); setReplyTo(null) }}
              className="text-encr-400 hover:text-encr-700 dark:hover:text-encr-200">
              <X size={14}/>
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-2">
          {/* Attach */}
          <input ref={fileRef} type="file" className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileUpload}/>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-encr-100 dark:bg-encr-800 text-encr-500 hover:text-accent hover:bg-accent/10 transition-colors">
            <Paperclip size={18}/>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              rows={1}
              className="input-field resize-none py-2.5 leading-5 max-h-28"
              style={{ minHeight: '42px' }}
              placeholder={uploading ? 'Uploading…' : `Message ${contact.full_name}…`}
              value={input}
              disabled={uploading}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
          </div>

          {/* Voice */}
          <button type="button" onClick={toggleRecording}
            className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors
              ${recording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-encr-100 dark:bg-encr-800 text-encr-500 hover:text-accent hover:bg-accent/10'}`}>
            {recording ? <StopCircle size={18}/> : <Mic size={18}/>}
          </button>

          {/* Send */}
          <button type="submit" disabled={!input.trim() && !editingMsg}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40 hover:bg-accent-dark active:scale-95 transition-all">
            <Send size={16}/>
          </button>
        </form>
      </div>
    </div>
  )
}