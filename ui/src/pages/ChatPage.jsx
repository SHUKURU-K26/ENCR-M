import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, Users, LogOut, Shield, Sun, Moon,
  Search, ChevronRight, ChevronLeft, Building2, Menu, X, Lock, EyeOff, Zap
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import { decryptMessage, deriveConversationKey } from '../utils/crypto'
import { ORG_ROLES } from '../constants'
import Avatar from '../components/Avatar'
import ChatWindow from '../components/ChatWindow'
import AdminPanel from '../components/AdminPanel'
import PasswordGate from '../components/PasswordGate'
import Logo from '../components/Logo'

const ORG_SECTIONS = [...ORG_ROLES.filter(r => r !== 'Other'), 'Other', 'Administration', 'Unassigned']

function deptOf(c) {
  if (c.role === 'admin') return 'Administration'
  if (c.org_role && ORG_SECTIONS.includes(c.org_role)) return c.org_role
  return 'Unassigned'
}

function deptIcon(section) {
  if (section === 'Administration') return Shield
  if (section === 'Unassigned') return Users
  return Building2
}

export default function ChatPage() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()

  const [contacts, setContacts]           = useState([])
  const [search, setSearch]               = useState('')
  const [activeContact, setActiveContact] = useState(null)
  const [pendingContact, setPendingContact] = useState(null)
  const [sidePanel, setSidePanel]         = useState('chats')
  const [selectedDept, setSelectedDept]   = useState(null)
  const [sideOpen, setSideOpen]           = useState(false)
  const [onlineUsers, setOnlineUsers]     = useState(new Set())
  const [unread, setUnread]               = useState({})
  const [lastMsgs, setLastMsgs]           = useState({})

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useSocket(useCallback((data) => {
    if (data.type === 'presence') {
      setOnlineUsers(prev => {
        const s = new Set(prev)
        data.status === 'online' ? s.add(data.user_id) : s.delete(data.user_id)
        return s
      })
    }
    if (data.type === 'message') {
      const p = data.payload
      const senderId = p.from
      if (senderId !== user.user_id) {
        setUnread(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }))
      }
      const key = deriveConversationKey(user.user_id, senderId === user.user_id ? p.to : senderId)
      const dec = p.type === 'text' ? decryptMessage(p.encrypted_body, p.iv, key) : `📎 ${p.type}`
      const otherId = senderId === user.user_id ? p.to : senderId
      setLastMsgs(prev => ({ ...prev, [otherId]: { text: dec, ts: p.timestamp } }))
    }
  }, [user.user_id]))

  // ── Load contacts ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/users/').then(r => setContacts(r.data)).catch(() => {})
  }, [])

  function requestChat(contact) {
    if (activeContact?.id === contact.id) {
      setSideOpen(false) // already open — just close the mobile drawer, no re-lock
      return
    }
    setPendingContact(contact)
  }

  function confirmChat() {
    setActiveContact(pendingContact)
    setUnread(prev => ({ ...prev, [pendingContact.id]: 0 }))
    setPendingContact(null)
    setSideOpen(false)
  }

  // ── Flat list (Chats tab) ────────────────────────────────────────────────
  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  )

  // ── Role-grouped (Members tab) ───────────────────────────────────────────
  const deptCounts = {}
  ORG_SECTIONS.forEach(s => { deptCounts[s] = 0 })
  contacts.forEach(c => { deptCounts[deptOf(c)] += 1 })

  const visibleSections  = ORG_SECTIONS.filter(s => deptCounts[s] > 0)
  const matchingSections = visibleSections.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const deptMembers = selectedDept
    ? contacts
        .filter(c => deptOf(c) === selectedDept)
        .filter(c =>
          c.full_name.toLowerCase().includes(search.toLowerCase()) ||
          c.username.toLowerCase().includes(search.toLowerCase())
        )
    : []

  const navItems = [
    { id: 'chats',    icon: MessageSquare, label: 'Chats' },
    { id: 'contacts', icon: Users,         label: 'Members' },
    ...(user?.role === 'admin' ? [{ id: 'admin', icon: Shield, label: 'Admin' }] : []),
  ]

  function formatTs(ts) {
    if (!ts) return ''
    const d = new Date(ts * 1000), now = new Date()
    return d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-encr-200 dark:border-encr-800">
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center">
              <Logo size={40} className="text-white"/>
            </div>
            <div>
              <div className="font-bold text-encr-900 dark:text-encr-100 text-base leading-none">V-UrugwiroChat</div>
              <div className="text-[10px] text-encr-400 font-mono">SECURE CHANNEL</div>
            </div>
          </div>
          <button onClick={() => setSideOpen(false)} className="lg:hidden text-encr-400">
            <X size={18}/>
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-encr-200 dark:border-encr-800">
          <Avatar name={user.full_name} color={user.avatar_color} size="sm" online={true}/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-encr-900 dark:text-encr-100 truncate">{user.full_name}</div>
            <div className="text-xs text-encr-400">@{user.username}
              {user.role === 'admin' && <span className="ml-1.5 text-accent font-bold">· ADMIN</span>}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="px-3 py-3 flex gap-1 border-b border-encr-200 dark:border-encr-800">
          {navItems.map(n => (
            <button key={n.id} onClick={() => { setSidePanel(n.id); setSelectedDept(null); setSearch('') }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors
                ${sidePanel === n.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-encr-400 hover:bg-encr-100 dark:hover:bg-encr-800/60'}`}>
              <n.icon size={16}/>
              {n.label}
            </button>
          ))}
        </div>

        {sidePanel === 'admin' && <AdminPanel/>}

        {/* ── CHATS TAB — unchanged flat list with previews ── */}
        {sidePanel === 'chats' && (
          <>
            <div className="px-3 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-encr-400"/>
                <input className="input-field pl-9 py-2 text-xs" placeholder="Search members…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-encr-400 text-sm">No members found</div>
              )}
              {filtered.map(c => {
                const last   = lastMsgs[c.id]
                const uCount = unread[c.id] || 0
                const isActive = activeContact?.id === c.id
                return (
                  <button key={c.id} onClick={() => requestChat(c)}
                    className={`sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`}>
                    <Avatar name={c.full_name} color={c.avatar_color} size="md" online={onlineUsers.has(c.id)}/>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-encr-900 dark:text-encr-100 truncate">{c.full_name}</span>
                        {last && <span className="text-[10px] text-encr-400 ml-1">{formatTs(last.ts)}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-encr-400 truncate">{last ? last.text : `@${c.username}`}</span>
                        {uCount > 0 && <span className="badge ml-1">{uCount}</span>}
                      </div>
                    </div>
                    {!isActive && <ChevronRight size={14} className="text-encr-300 flex-shrink-0"/>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── MEMBERS TAB — role-based drill down ── */}
        {sidePanel === 'contacts' && (
          <>
            <div className="px-3 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-encr-400"/>
                <input className="input-field pl-9 py-2 text-xs"
                  placeholder={selectedDept ? `Search in ${selectedDept}…` : 'Search departments…'}
                  value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {selectedDept === null ? (
                <>
                  {matchingSections.length === 0 && (
                    <div className="text-center py-12 text-encr-400 text-sm">No departments found</div>
                  )}
                  {matchingSections.map(section => {
                    const Icon = deptIcon(section)
                    return (
                      <button key={section} onClick={() => { setSelectedDept(section); setSearch('') }}
                        className="sidebar-item w-full">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-accent"/>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-encr-900 dark:text-encr-100">{section}</div>
                          <div className="text-xs text-encr-400">
                            {deptCounts[section]} member{deptCounts[section] !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-encr-300 flex-shrink-0"/>
                      </button>
                    )
                  })}
                </>
              ) : (
                <>
                  <button onClick={() => { setSelectedDept(null); setSearch('') }}
                    className="flex items-center gap-2 text-xs text-encr-400 hover:text-encr-700 dark:hover:text-encr-200 px-2 py-2 mb-1">
                    <ChevronLeft size={14}/> All departments
                  </button>

                  {deptMembers.length === 0 && (
                    <div className="text-center py-12 text-encr-400 text-sm">No members in {selectedDept}</div>
                  )}
                  {deptMembers.map(c => {
                    const isActive = activeContact?.id === c.id
                    return (
                      <button key={c.id} onClick={() => requestChat(c)}
                        className={`sidebar-item w-full ${isActive ? 'sidebar-item-active' : ''}`}>
                        <Avatar name={c.full_name} color={c.avatar_color} size="md" online={onlineUsers.has(c.id)}/>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-encr-900 dark:text-encr-100 truncate">{c.full_name}</div>
                          <div className="text-xs text-encr-400 truncate">@{c.username}</div>
                        </div>
                        {!isActive && <ChevronRight size={14} className="text-encr-300 flex-shrink-0"/>}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </>
        )}

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-encr-200 dark:border-encr-800 flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost flex items-center gap-1.5 text-xs flex-1">
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={logout}
            className="btn-ghost flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1">
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-encr-50 dark:bg-encr-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[340px] flex-shrink-0 bg-white dark:bg-encr-900 border-r border-encr-200 dark:border-encr-800">
        <SidebarContent/>
      </aside>

      {/* Mobile drawer */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSideOpen(false)}/>
          <aside className="absolute left-0 top-0 bottom-0 w-[300px] bg-white dark:bg-encr-900 z-50 flex flex-col shadow-2xl">
            <SidebarContent/>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-encr-900 border-b border-encr-200 dark:border-encr-800">
          <button onClick={() => setSideOpen(true)} className="text-encr-500">
            <Menu size={22}/>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <Logo size={20} className="text-white"/>
            </div>
            <span className="font-bold text-encr-900 dark:text-encr-100">V-UrugwiroChat</span>
          </div>
        </div>

        {activeContact ? (
          <ChatWindow
            contact={activeContact}
            onClose={() => setActiveContact(null)}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mb-6">
              <Lock size={40} className="text-accent/60"/>
            </div>
            <h2 className="text-2xl font-bold text-encr-800 dark:text-encr-100 mb-2">
              Select a contact to begin
            </h2>
            <p className="text-encr-400 text-sm max-w-xs leading-relaxed">
              All conversations are AES-256 end-to-end encrypted.
            </p>
            <div className="flex items-center gap-4 mt-6">
              {[
                { icon: Lock, label: 'E2E Encrypted' },
                { icon: Zap, label: 'Real-time' },
                { icon: EyeOff, label: 'Zero-Knowledge' },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-encr-100 dark:bg-encr-800/60">
                  <f.icon size={14} className="text-accent" />
                  <span className="text-[10px] text-encr-500 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSideOpen(true)}
              className="lg:hidden mt-6 btn-primary flex items-center gap-2">
              <Users size={16}/> Open Contacts
            </button>
          </div>
        )}
      </main>

      {pendingContact && (
        <PasswordGate
          contact={pendingContact}
          onSuccess={confirmChat}
          onCancel={() => setPendingContact(null)}
        />
      )}
    </div>
  )
}