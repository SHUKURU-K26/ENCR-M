import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit2, Trash2, Reply, Check, CheckCheck, Mic, FileText, X, Download } from 'lucide-react'
function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ msg, isOwn, onEdit, onDelete, onReply, replyMsg }) {
  const [menu, setMenu] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = e => { if (e.key === 'Escape') setLightbox(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])
  
  if (msg.deleted) return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5`}>
      <div className="px-3 py-1.5 rounded-2xl bg-encr-100/60 dark:bg-encr-800/40 text-encr-400 italic text-xs">
        🗑 Message deleted
      </div>
    </div>
  )

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5 group`}>
      <div className="relative" style={{ maxWidth: 'min(75%, 480px)' }}>

        {/* Reply preview */}
        {replyMsg && (
          <div className={`text-xs px-2.5 py-1.5 mb-1 rounded-xl border-l-2 border-accent
            ${isOwn ? 'bg-encr-800/60 text-encr-300' : 'bg-encr-100 dark:bg-encr-800 text-encr-400'}`}>
            <div className="font-semibold text-accent text-[10px] mb-0.5">Replying to</div>
            <div className="truncate text-xs">{replyMsg.decrypted || '[media]'}</div>
          </div>
        )}

        {/* Bubble */}
        <div className={`
          relative inline-flex flex-col
          ${isOwn
            ? 'bg-accent text-white rounded-2xl rounded-br-sm'
            : 'bg-encr-100 dark:bg-encr-800 text-encr-900 dark:text-encr-100 rounded-2xl rounded-bl-sm'}
          px-3 py-2 shadow-sm
        `}>

          {/* Image */}
          {msg.type === 'image' && msg.file_url && (
            <img src={msg.file_url} alt="img"
              onClick={() => setLightbox(true)}
              className="rounded-xl mb-1.5 max-h-56 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxWidth: '260px' }}/>
          )}

          {/* Video */}
          {msg.type === 'video' && msg.file_url && (
            <video src={msg.file_url} controls
              className="rounded-xl mb-1.5 max-h-44"
              style={{ maxWidth: '260px' }}/>
          )}

          {/* Voice */}
          {msg.type === 'voice' && msg.file_url && (
            <div className="flex items-center gap-2 mb-1 pr-1">
              <Mic size={14} className="flex-shrink-0"/>
              <audio src={msg.file_url} controls className="h-7" style={{ maxWidth: '180px' }}/>
            </div>
          )}

          {/* File */}
          {msg.type === 'file' && msg.file_url && (
            <a href={msg.file_url} download={msg.file_name} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 mb-1 hover:opacity-80 pr-1">
              <FileText size={14} className="flex-shrink-0"/>
              <span className="text-xs underline truncate" style={{ maxWidth: '180px' }}>
                {msg.file_name || 'File'}
              </span>
            </a>
          )}

          {/* Text — the key fix: no forced line breaks, natural wrapping */}
          {msg.decrypted && (
            <p className="text-sm leading-snug break-words whitespace-pre-wrap m-0"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {msg.decrypted}
            </p>
          )}

          {/* Timestamp + status row — inline after text */}
          <div className={`flex items-center gap-1 mt-1
            ${isOwn ? 'justify-end' : 'justify-end'}`}>
            {msg.edited && (
              <span className={`text-[10px] italic ${isOwn ? 'text-white/50' : 'text-encr-400'}`}>
                edited
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-encr-400'}`}>
              {formatTime(msg.timestamp)}
            </span>
            {isOwn && (
              msg.read
                ? <CheckCheck size={11} className="text-white/70"/>
                : <Check size={11} className="text-white/50"/>
            )}
          </div>
        </div>

        {/* Context menu trigger — appears on hover */}
        <button
          onClick={() => setMenu(m => !m)}
          className={`
            absolute top-1 ${isOwn ? '-left-7' : '-right-7'}
            opacity-0 group-hover:opacity-100 transition-opacity
            w-6 h-6 flex items-center justify-center rounded-lg
            bg-encr-100 dark:bg-encr-800 text-encr-400
            hover:text-encr-900 dark:hover:text-encr-100
          `}>
          <MoreVertical size={13}/>
        </button>

        {/* Context menu dropdown */}
        {menu && (
          <div
            ref={menuRef}
            onMouseLeave={() => setMenu(false)}
            className={`
              absolute z-20 top-full mt-1
              ${isOwn ? 'right-0' : 'left-0'}
              glass-card p-1 min-w-[130px] text-sm
            `}
            style={{ animation: 'slideUp 0.15s ease' }}>
            <button onClick={() => { onReply(msg); setMenu(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                hover:bg-encr-100 dark:hover:bg-encr-800
                text-encr-700 dark:text-encr-200 text-xs">
              <Reply size={13}/> Reply
            </button>
            {isOwn && msg.type === 'text' && (
              <button onClick={() => { onEdit(msg); setMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                  hover:bg-encr-100 dark:hover:bg-encr-800
                  text-encr-700 dark:text-encr-200 text-xs">
                <Edit2 size={13}/> Edit
              </button>
            )}
          {isOwn && (
              <button onClick={() => { onDelete(msg.id); setMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                  hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-xs">
                <Trash2 size={13}/> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightbox && msg.type === 'image' && msg.file_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightbox(false)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={msg.file_url} alt="img"
              className="rounded-xl max-w-[90vw] max-h-[90vh] object-contain shadow-card"/>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <a href={msg.file_url} download={msg.file_name || 'image'} target="_blank" rel="noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors">
                <Download size={16}/>
              </a>
              <button onClick={() => setLightbox(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors">
                <X size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}