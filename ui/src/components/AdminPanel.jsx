import { useState, useEffect } from 'react'
import {
  KeyRound, Copy, Users, Clock, CheckCircle, Shield,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  UserCheck, AlertCircle, XCircle
} from 'lucide-react'
import api from '../utils/api'
import Avatar from './Avatar'

const ORG_ROLES = [
  'Minister', 'Senator', 'Deputy', 'Governor',
  'Mayor', 'Director General', 'Permanent Secretary', 'Other'
]

export default function AdminPanel() {
  const [otp, setOtp]         = useState(null)
  const [otpList, setOtpList] = useState([])
  const [grouped, setGrouped] = useState({})
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [tab, setTab]         = useState('otp')
  const [genError, setGenError] = useState('')

  // OTP generation form
  const [selRole, setSelRole]         = useState('')
  const [roleDetail, setRoleDetail]   = useState('')

  // Which role sections are expanded in Members tab
  const [expanded, setExpanded] = useState({})

  useEffect(() => { fetchData() }, [tab])

  async function fetchData() {
    try {
      if (tab === 'otp') {
        const [otpRes, uRes] = await Promise.all([
          api.get('/admin/otps'),
          api.get('/admin/users')
        ])
        setOtpList(otpRes.data.slice(-10).reverse())
        setTotalUsers(uRes.data.filter(u => u.role !== 'admin').length)
      } else {
        const { data } = await api.get('/admin/users/grouped')
        setGrouped(data)
        setTotalUsers(Object.values(data).flat().length)
        // expand sections that have members by default
        const initial = {}
        Object.entries(data).forEach(([role, members]) => {
          if (members.length > 0) initial[role] = true
        })
        setExpanded(initial)
      }
    } catch {}
  }

  async function generateOTP() {
    setGenError('')
    if (!selRole) { setGenError('Select a role before generating'); return }
    if (selRole === 'Other' && !roleDetail.trim()) {
      setGenError('Describe the custom role'); return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/admin/generate-otp', {
        role: selRole,
        role_detail: selRole === 'Other' ? roleDetail.trim() : null
      })
      setOtp(data)
      await fetchData()
    } catch (e) {
      setGenError(e.response?.data?.detail || 'Failed to generate OTP')
    } finally { setLoading(false) }
  }

  async function toggleUser(id) {
    await api.patch(`/admin/users/${id}/toggle`)
    await fetchData()
  }

  function copyOTP() {
    if (!otp) return
    navigator.clipboard.writeText(otp.otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function timeLeft(exp) {
    const s = Math.max(0, Math.floor(exp - Date.now() / 1000))
    return s > 0 ? `${Math.floor(s / 60)}m ${s % 60}s` : 'Expired'
  }

  function toggleSection(role) {
    setExpanded(prev => ({ ...prev, [role]: !prev[role] }))
  }

  // Sections that actually have members, plus always show Unassigned at the end
  const sectionOrder = [
    ...ORG_ROLES.filter(r => r !== 'Other'),
    'Other', 'Unassigned'
  ].filter(r => grouped[r] !== undefined)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-encr-200 dark:border-encr-800">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-accent"/>
          <h2 className="font-display font-bold text-encr-900 dark:text-encr-100 text-lg">
            Admin Panel
          </h2>
        </div>
        <p className="text-xs text-encr-400">Manage access codes and members</p>
      </div>

      {/* Tabs */}
      <div className="flex px-5 pt-4 gap-2">
        {[
          { id: 'otp',   label: 'OTP Generator' },
          { id: 'users', label: `Members (${totalUsers})` }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${tab === t.id
                ? 'bg-accent text-white'
                : 'text-encr-400 hover:text-encr-700 dark:hover:text-encr-200 hover:bg-encr-100 dark:hover:bg-encr-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-4 space-y-4">

        {/* ── OTP Tab ── */}
        {tab === 'otp' && (
          <>
            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-encr-400 uppercase tracking-wider">
                Invite role
              </label>
              <div className="relative">
                <select
                  value={selRole}
                  onChange={e => { setSelRole(e.target.value); setRoleDetail(''); setGenError('') }}
                  className="input-field appearance-none pr-9 cursor-pointer">
                  <option value="">Select institutional role…</option>
                  {ORG_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-encr-400 pointer-events-none"/>
              </div>

              {/* "Other" free-text */}
              {selRole === 'Other' && (
                <input
                  className="input-field"
                  placeholder="Describe the role (e.g. Chief of Staff)"
                  value={roleDetail}
                  onChange={e => setRoleDetail(e.target.value)}
                />
              )}
            </div>

            {/* Error */}
            {genError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-3 py-2.5 text-sm">
                <AlertCircle size={14}/> {genError}
              </div>
            )}

            {/* Generate button */}
            <button onClick={generateOTP} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <KeyRound size={16}/>}
              Generate Invite Code
            </button>

            {/* Generated OTP display */}
            {otp && (
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-encr-400 uppercase tracking-wider">
                      Generated Code
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <UserCheck size={11} className="text-accent"/>
                      <span className="text-xs text-accent font-medium">
                        {otp.role === 'Other' ? otp.role_detail : otp.role}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-warn">
                    <Clock size={12}/> {timeLeft(otp.expires_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-encr-900 dark:bg-black/40 rounded-xl px-5 py-4">
                  <span className="font-mono text-3xl font-bold tracking-[0.4em] text-accent">
                    {otp.otp}
                  </span>
                  <button onClick={copyOTP}
                    className={`transition-colors ${copied ? 'text-success' : 'text-encr-400 hover:text-accent'}`}>
                    {copied ? <CheckCircle size={20}/> : <Copy size={20}/>}
                  </button>
                </div>
                <p className="text-xs text-encr-400">
                  Share privately. Expires in 5 minutes, single-use only.
                  The recipient <span className="text-encr-300 font-medium">must select
                  "{otp.role === 'Other' ? otp.role_detail : otp.role}"</span> during signup.
                </p>
              </div>
            )}

            {/* OTP history */}
            <div>
              <div className="text-xs font-semibold text-encr-400 uppercase tracking-wider mb-3">
                Recent Codes
              </div>
              <div className="space-y-2">
                {otpList.length === 0 && (
                  <div className="text-center py-8 text-encr-400 text-sm">
                    No codes generated yet
                  </div>
                )}
                {otpList.map(o => (
                  <div key={o.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-encr-50 dark:bg-encr-800/50">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-encr-700 dark:text-encr-300 tracking-widest">
                        {o.code}
                      </span>
                      {o.role && (
                        <div className="text-[10px] text-encr-400 mt-0.5">
                          {o.role === 'Other' ? o.role_detail : o.role}
                        </div>
                      )}
                    </div>
                    <span className={`ml-auto flex-shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                      ${o.used ? 'bg-success/10 text-success' : o.expired ? 'bg-red-500/10 text-red-400' : 'bg-warn/10 text-warn'}`}>
                      {o.used ? <CheckCircle size={11}/> : o.expired ? <XCircle size={11}/> : <Clock size={11}/>}
                      {o.used ? 'Used' : o.expired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Members Tab ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            {sectionOrder.map(role => {
              const members = grouped[role] || []
              if (members.length === 0) return null
              const isOpen = !!expanded[role]
              return (
                <div key={role}
                  className="rounded-xl border border-encr-200 dark:border-encr-700 overflow-hidden">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(role)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-encr-50 dark:bg-encr-800/60 hover:bg-encr-100 dark:hover:bg-encr-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-accent"/>
                      <span className="text-sm font-semibold text-encr-900 dark:text-encr-100">
                        {role}
                      </span>
                      <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
                        {members.length}
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronDown size={14} className="text-encr-400"/>
                      : <ChevronRight size={14} className="text-encr-400"/>}
                  </button>

                  {/* Members list */}
                  {isOpen && (
                    <div className="divide-y divide-encr-100 dark:divide-encr-800">
                      {members.map(u => (
                        <div key={u.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors
                            ${u.is_active
                              ? 'bg-white dark:bg-encr-900'
                              : 'bg-red-50/40 dark:bg-red-900/10'}`}>
                          <Avatar name={u.full_name} color={u.avatar_color} avatarUrl={u.avatar_url} size="sm" online={null}/>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-encr-900 dark:text-encr-100 truncate">
                                {u.full_name}
                              </span>
                              {/* org_role badge */}
                              <span className="text-[9px] bg-encr-100 dark:bg-encr-700 text-encr-500 dark:text-encr-300 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide flex-shrink-0">
                                {u.org_role === 'Other' ? u.org_role_detail : u.org_role}
                              </span>
                            </div>
                            <div className="text-xs text-encr-400">@{u.username}</div>
                          </div>
                          {!u.is_active && (
                            <span className="text-[10px] text-red-400 font-medium flex-shrink-0">
                              Disabled
                            </span>
                          )}
                          <button onClick={() => toggleUser(u.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0
                              ${u.is_active
                                ? 'text-success hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                                : 'text-red-400 hover:bg-success/10 hover:text-success'}`}>
                            {u.is_active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {totalUsers === 0 && (
              <div className="text-center py-12 text-encr-400 text-sm">
                No members yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}