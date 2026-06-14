import { useState } from 'react'
import { Lock, X, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

export default function PasswordGate({ contact, onSuccess, onCancel }) {
  const { user } = useAuth()
  const [pwd, setPwd]   = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleVerify(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await api.post('/auth/verify-password', { user_id: user.user_id, password: pwd })
      onSuccess()
    } catch (e) {
      setErr(e.response?.data?.detail || 'Incorrect password')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-accent" />
            </div>
            <div>
              <div className="font-semibold text-encr-900 dark:text-encr-100">Security Check</div>
              <div className="text-xs text-encr-400">Verify your identity to open chat</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-encr-400 hover:text-encr-200">
            <X size={18}/>
          </button>
        </div>

        {/* Contact preview */}
        <div className="flex items-center gap-3 p-3 bg-encr-50 dark:bg-encr-800/60 rounded-xl mb-5">
          <Avatar name={contact.full_name} color={contact.avatar_color} size="sm" />
          <div>
            <div className="text-sm font-semibold text-encr-900 dark:text-encr-100">{contact.full_name}</div>
            <div className="text-xs text-encr-400">@{contact.username}</div>
          </div>
          <Lock size={14} className="ml-auto text-encr-400" />
        </div>

        {err && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-3 py-2.5 mb-4 text-sm">
            <AlertCircle size={14}/> {err}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-encr-400"/>
            <input
              className="input-field pl-10 pr-10"
              type={show ? 'text' : 'password'}
              placeholder="Your password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              autoFocus required />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-encr-400 hover:text-encr-200">
              {show ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          <button type="submit" disabled={loading || !pwd} className="btn-primary w-full">
            {loading ? 'Verifying…' : 'Confirm & Open Chat'}
          </button>
        </form>
      </div>
    </div>
  )
}