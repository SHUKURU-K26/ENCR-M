import { useState, useEffect } from 'react'
import { KeyRound, Copy, RefreshCw, Users, Clock, CheckCircle, XCircle, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../utils/api'
import Avatar from './Avatar'

export default function AdminPanel() {
  const [otp, setOtp]         = useState(null)
  const [otpList, setOtpList] = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [tab, setTab]         = useState('otp')  // otp | users

  useEffect(() => { fetchData() }, [tab])

  async function fetchData() {
    try {
      if (tab === 'otp') {
        const [otpRes, uRes] = await Promise.all([api.get('/admin/otps'), api.get('/admin/users')])
        setOtpList(otpRes.data.slice(-10).reverse())
        setUsers(uRes.data)
      } else {
        const { data } = await api.get('/admin/users')
        setUsers(data)
      }
    } catch {}
  }

  async function generateOTP() {
    setLoading(true)
    try {
      const { data } = await api.post('/admin/generate-otp')
      setOtp(data)
      await fetchData()
    } catch {}
    finally { setLoading(false) }
  }

  async function toggleUser(id) {
    await api.patch(`/admin/users/${id}/toggle`)
    await fetchData()
  }

  function copyOTP() {
    if (otp) {
      navigator.clipboard.writeText(otp.otp)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  function timeLeft(exp) {
    const s = Math.max(0, Math.floor(exp - Date.now() / 1000))
    return s > 0 ? `${Math.floor(s/60)}m ${s%60}s` : 'Expired'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-encr-200 dark:border-encr-800">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-accent"/>
          <h2 className="font-display font-bold text-encr-900 dark:text-encr-100 text-lg">Admin Panel</h2>
        </div>
        <p className="text-xs text-encr-400">Manage access codes and members</p>
      </div>

      {/* Tabs */}
      <div className="flex px-5 pt-4 gap-2">
        {[{ id: 'otp', label: 'OTP Generator' }, { id: 'users', label: `Members (${users.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-accent text-white' : 'text-encr-400 hover:text-encr-700 dark:hover:text-encr-200 hover:bg-encr-100 dark:hover:bg-encr-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-4 space-y-4">
        {/* OTP Tab */}
        {tab === 'otp' && (
          <>
            {/* Generate button */}
            <button onClick={generateOTP} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <KeyRound size={16}/>}
              Generate New OTP
            </button>

            {/* Generated OTP display */}
            {otp && (
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-encr-400 uppercase tracking-wider">Generated Code</span>
                  <span className="flex items-center gap-1 text-xs text-warn">
                    <Clock size={12}/> {timeLeft(otp.expires_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-encr-900 dark:bg-black/40 rounded-xl px-5 py-4">
                  <span className="font-mono text-3xl font-bold tracking-[0.4em] text-accent">{otp.otp}</span>
                  <button onClick={copyOTP} className={`transition-colors ${copied ? 'text-success' : 'text-encr-400 hover:text-accent'}`}>
                    {copied ? <CheckCircle size={20}/> : <Copy size={20}/>}
                  </button>
                </div>
                <p className="text-xs text-encr-400">Share this code privately with the new member. It expires in 5 minutes and can only be used once.</p>
              </div>
            )}

            {/* OTP history */}
            <div>
              <div className="text-xs font-semibold text-encr-400 uppercase tracking-wider mb-3">Recent OTPs</div>
              <div className="space-y-2">
                {otpList.length === 0 && (
                  <div className="text-center py-8 text-encr-400 text-sm">No OTPs generated yet</div>
                )}
                {otpList.map(o => (
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-encr-50 dark:bg-encr-800/50">
                    <span className="font-mono font-bold text-encr-700 dark:text-encr-300 tracking-widest">{o.code}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium
                      ${o.used ? 'bg-success/10 text-success' : o.expired ? 'bg-red-500/10 text-red-400' : 'bg-warn/10 text-warn'}`}>
                      {o.used ? '✓ Used' : o.expired ? '✗ Expired' : '⏱ Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                ${u.is_active ? 'bg-encr-50 dark:bg-encr-800/50 border-encr-200 dark:border-encr-700' : 'bg-red-50/30 dark:bg-red-900/10 border-red-200/40 dark:border-red-800/30'}`}>
                <Avatar name={u.full_name} color={u.avatar_color} size="sm" online={null}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-encr-900 dark:text-encr-100 truncate">{u.full_name}</span>
                    {u.role === 'admin' && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                  </div>
                  <div className="text-xs text-encr-400">@{u.username}</div>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => toggleUser(u.id)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                      ${u.is_active ? 'text-success hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500' : 'text-red-400 hover:bg-success/10 hover:text-success'}`}>
                    {u.is_active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}