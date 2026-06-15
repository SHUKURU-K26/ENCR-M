import { useState } from 'react'
import { Shield, Lock, Eye, EyeOff, Phone, User, KeyRound, ArrowRight, X, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']

export default function AuthPage() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()

  const [tab, setTab]           = useState('login')   // login | signup
  const [loginBy, setLoginBy]   = useState('username') // username | phone
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // OTP pre-check modal
  const [otpModal, setOtpModal]   = useState(false)
  const [otpCode, setOtpCode]     = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpLoading, setOtpLoading]   = useState(false)
  const [otpError, setOtpError]       = useState('')

  // Sign-up form
  const [form, setForm] = useState({
    username: '', full_name: '', phone: '', password: '', confirmPwd: '',
    avatar_color: COLORS[0],
  })

  // Login form
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })

  // ── OTP verification ────────────────────────────────────────────────────
  async function handleVerifyOTP() {
    if (otpCode.length !== 6) { setOtpError('Enter the 6-digit code'); return }
    setOtpLoading(true); setOtpError('')
    try {
      await api.post('/auth/verify-otp', { otp: otpCode })
      setOtpVerified(true)
      setTimeout(() => setOtpModal(false), 800)
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Invalid or expired OTP')
    } finally { setOtpLoading(false) }
  }

  // ── Login ───────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', loginForm)
      login({ user_id: data.user_id, username: data.username, full_name: data.full_name, role: data.role, avatar_color: data.avatar_color }, data.token)
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  // ── Sign up ─────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault(); setError('')
    if (!otpVerified) { setOtpModal(true); return }
    if (form.password !== form.confirmPwd) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', { otp: otpCode, ...form })
      login({ user_id: data.user_id, username: data.username, full_name: data.full_name, role: data.role, avatar_color: data.avatar_color }, data.token)
    } catch (e) {
      setError(e.response?.data?.detail || 'Signup failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-encr-950 overflow-hidden relative">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-encr-600/5 rounded-full blur-[180px]" />
      </div>

      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-encr-900 via-encr-800 to-encr-950 p-12 relative overflow-hidden border-r border-encr-700/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%239C92AC fill-opacity=0.04%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-glow">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-tight">ENCR-M</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-white leading-tight mb-6">
            Classified<br/>
            <span className="text-accent">Communication</span><br/>
            Infrastructure
          </h1>
          <p className="text-encr-300 text-lg leading-relaxed max-w-sm">
            Advanced-grade AES-256 end-to-end encryption. Built for institutions that cannot afford compromise.
            Created By SK26 | Senior Software Engineer 
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon: '🔐', label: 'AES-256-CBC Encryption', desc: 'Every message encrypted before leaving your device' },
            { icon: '⚡', label: 'Real-time Delivery', desc: 'WebSocket-powered instant messaging' },
            { icon: '🛡️', label: 'Zero-Knowledge Server', desc: 'Server stores only ciphertext — never plaintext' },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{f.label}</div>
                <div className="text-encr-400 text-xs mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white">ENCR-M</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex bg-encr-900/60 border border-encr-700/50 rounded-2xl p-1 mb-8">
            {['login','signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200
                ${tab === t ? 'bg-accent text-white shadow-glow-sm' : 'text-encr-400 hover:text-encr-200'}`}
              >
                {t === 'login' ? (
                  <><Lock size={14} /> <span>Sign In</span></>
                ) : (
                  <><User size={14} /> <span>Create Account</span></>
                )}
              </button>

            ))}
          </div>

          <div className="glass-card p-8">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <div className="text-encr-100 font-display text-2xl font-bold mb-1">Welcome back</div>
                  <div className="text-encr-400 text-sm">Sign in to your secure channel</div>
                </div>

                {/* Toggle login method */}
                <div className="flex gap-2">
                  {['username','phone'].map(m => (
                    <button type="button" key={m} onClick={() => setLoginBy(m)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${loginBy === m ? 'bg-accent/15 border-accent/40 text-accent' : 'border-encr-700 text-encr-400 hover:border-encr-500'}`}>
                      {m === 'username' ? <User size={12}/> : <Phone size={12}/>}
                      {m === 'username' ? 'Username' : 'Phone'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-encr-400">
                    {loginBy === 'username' ? <User size={16}/> : <Phone size={16}/>}
                  </span>
                  <input className="input-field pl-10"
                    placeholder={loginBy === 'username' ? 'Username' : 'Phone number'}
                    value={loginForm.identifier}
                    onChange={e => setLoginForm(f => ({...f, identifier: e.target.value}))}
                    required />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-encr-400" />
                  <input className="input-field pl-10 pr-10"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({...f, password: e.target.value}))}
                    required />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-encr-400 hover:text-encr-200">
                    {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                  {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16}/></>}
                </button>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <div className="text-encr-100 font-display text-2xl font-bold mb-1">Join ENCR-M</div>
                  <div className="text-encr-400 text-sm">Requires OTP from your institution head</div>
                </div>

                {/* OTP status banner */}
                {!otpVerified ? (
                  <button type="button" onClick={() => setOtpModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors text-sm text-accent font-medium">
                    <KeyRound size={16}/> Enter your OTP code to continue
                    <ArrowRight size={14} className="ml-auto"/>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-success/10 border border-success/30 text-success rounded-xl px-4 py-3 text-sm font-medium">
                    <CheckCircle2 size={16}/> OTP verified — complete your profile
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" placeholder="Full name" value={form.full_name}
                    onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required disabled={!otpVerified} />
                  <input className="input-field" placeholder="Username" value={form.username}
                    onChange={e => setForm(f => ({...f, username: e.target.value}))} required disabled={!otpVerified} />
                </div>
                <input className="input-field" placeholder="Phone number" value={form.phone}
                  onChange={e => setForm(f => ({...f, phone: e.target.value}))} required disabled={!otpVerified} />

                <div className="relative">
                  <input className="input-field pr-10" type={showPwd ? 'text' : 'password'}
                    placeholder="Password (min 6 chars)" value={form.password}
                    onChange={e => setForm(f => ({...f, password: e.target.value}))} required disabled={!otpVerified} />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-encr-400">
                    {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                <input className="input-field" type="password" placeholder="Confirm password"
                  value={form.confirmPwd} onChange={e => setForm(f => ({...f, confirmPwd: e.target.value}))}
                  required disabled={!otpVerified} />

                {/* Avatar colour */}
                <div className="space-y-2">
                  <label className="text-encr-400 text-xs font-medium">Avatar colour</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({...f, avatar_color: c}))}
                        style={{ background: c }}
                        className={`w-7 h-7 rounded-full transition-transform ${form.avatar_color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`} />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || !otpVerified} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                  {loading ? 'Creating account…' : 'Create Secure Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {otpModal && (
        <div className="modal-overlay" onClick={() => setOtpModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-display text-xl font-bold text-encr-900 dark:text-encr-100">Institution OTP</div>
                <div className="text-encr-400 text-sm mt-1">Enter the 6-digit code from your admin</div>
              </div>
              <button onClick={() => setOtpModal(false)} className="text-encr-400 hover:text-encr-200 transition-colors">
                <X size={20}/>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-5">
              <span>⏱</span>
              <p className="text-amber-400 text-xs">This code expires 5 minutes after generation. Request a fresh one if expired.</p>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle size={14}/> {otpError}
              </div>
            )}

            {otpVerified ? (
              <div className="flex items-center gap-3 bg-success/10 border border-success/30 text-success rounded-xl px-4 py-4">
                <CheckCircle2 size={20}/> <span className="font-semibold">OTP verified successfully!</span>
              </div>
            ) : (
              <>
                <input className="input-field text-center text-2xl font-mono tracking-[0.5em] mb-5"
                  maxLength={6} placeholder="••••••"
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                <button onClick={handleVerifyOTP} disabled={otpLoading || otpCode.length !== 6}
                  className="btn-primary w-full">
                  {otpLoading ? 'Verifying…' : 'Verify OTP'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}