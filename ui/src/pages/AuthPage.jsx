import { useState, useRef } from 'react'
import { Shield, Lock, Eye, EyeOff, Phone, UserCheck, User, KeyRound, ArrowRight, X, ChevronDown, CheckCircle2, AlertCircle, Zap, Clock, Camera } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/Logo'
import ImigongoBorder from '../components/ImigongoBorder'
import ImigongoBackdrop from '../components/ImigongoBackdrop'
import SplashScreen from '../components/SplashScreen'
import image1 from '../assets/image.png'

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
// Sign-up form
  const [form, setForm] = useState({
    username: '', full_name: '', phone: '', password: '', confirmPwd: '',
    org_role: '', org_role_detail: '',
  })
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)

  function handleAvatarPick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  // No more manual color picking — derive a consistent fallback color
  // from the person's name, used only if they skip the photo
  function hashColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    return COLORS[hash % COLORS.length]
  }

  // Login form
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })

  // ── OTP verification ────────────────────────────────────────────────────
  async function handleVerifyOTP() {
    if (otpCode.length !== 6) { setOtpError('Enter the 6-digit code'); return }
    setOtpLoading(true); setOtpError('')
    try {
      const { data } = await api.post('/auth/verify-otp', { otp: otpCode })
      setOtpVerified(true)
      // Pre-fill and lock the role the admin bound to this OTP
      if (data.role) {
        setForm(f => ({
          ...f,
          org_role: data.role,
          org_role_detail: data.role_detail || ''
        }))
      }
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
      const avatar_color = hashColor(form.full_name || form.username || 'user')
      const { data } = await api.post('/auth/signup', {
        otp: otpCode, ...form,
        avatar_color,
        org_role: form.org_role,
        org_role_detail: form.org_role === 'Other' ? form.org_role_detail : null,
      })

      let avatar_url = null
      if (avatarFile) {
        try {
          // Stash the token now so the upload call below is authenticated —
          // we deliberately call login() once at the end, not yet
          localStorage.setItem('encr_token', data.token)
          const fd = new FormData(); fd.append('file', avatarFile)
          const { data: uploaded } = await api.post('/media/upload', fd)
          await api.patch('/users/me/avatar', { url: uploaded.url })
          avatar_url = uploaded.url
        } catch {
          // Non-fatal — account still gets created, just without a photo for now
        }
      }

      login({
        user_id: data.user_id, username: data.username, full_name: data.full_name,
        role: data.role, avatar_color: data.avatar_color, avatar_url, org_role: form.org_role,
      }, data.token)
    } catch (e) {
      setError(e.response?.data?.detail || 'Signup failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-encr-50 dark:bg-encr-950 overflow-hidden relative">   
      <SplashScreen>
        V-Urugwiro<span className="text-accent">Chat</span>
      </SplashScreen>
      {/* Subtle Imigongo-inspired geometric backdrop */}
      <ImigongoBackdrop />      
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/15 rounded-full blur-[120px]" />
      </div>

      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-encr-50 dark:bg-gradient-to-br dark:from-encr-900 dark:via-encr-800 dark:to-encr-950 p-12 relative overflow-hidden border-r border-encr-200 dark:border-encr-700/30">
        
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%239C92AC fill-opacity=0.04%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-15 h-15 bg-accent rounded-xl flex items-center justify-center shadow-glow">
              <Logo size={40} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold text-encr-900 dark:text-white tracking-wide ">V-Urugwiro<span className='text-accent'>Chart</span></span>
          </div>
          <h1 className="font-display text-5xl font-bold text-encr-900 dark:text-white leading-tight mb-6">
            Trusted<br/>
          <span className="text-accent">Conversations</span><br/>of State
          </h1>
          <p className="text-encr-600 dark:text-encr-300 text-lg leading-relaxed max-w-sm">
            Every conversation here stays exactly where it belongs — between the people having it.
          </p>
        </div>

        

        <div className="relative space-y-4">
          {/* feature list — replace the array and the rendering */}
          {[
            { icon: Lock, label: 'Sealed the Moment You Send It', desc: 'What you write becomes unreadable to anyone else the instant it leaves your hands.' },
            { icon: Zap, label: 'Delivered Without Delay', desc: 'Conversations move as fast as you do — no waiting, no lag.' },
            { icon: EyeOff, label: 'Private, Even From Us', desc: 'Not even the system itself can read what is said. Only the people in the conversation can.' },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl bg-encr-900/5 dark:bg-white/5 border border-encr-900/10 dark:border-white/10">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <f.icon size={16} className="text-accent" />
              </div>
              <div>
                <div className="text-encr-900 dark:text-white font-semibold text-sm">{f.label}</div>
                <div className="text-encr-400 text-xs mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}          
        </div>
        <p className="text-encr-100 text-xs text-center mt-3">
          <span className="font-semibold text-encr-400"> {new Date().getFullYear()}</span> &copy; V-Urugwiro Chat. All rights reserved.
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Logo size={20} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-encr-900 dark:text-white">Urugwiro</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex bg-encr-100/60 dark:bg-encr-900/60 border border-encr-200 dark:border-encr-700/50 rounded-2xl p-1 mb-8">
              {['login','signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 hover:cursor-pointer hover:opacity-60 rounded-xl text-sm font-semibold capitalize transition-all duration-200
                ${tab === t ? 'bg-accent text-white shadow-glow-sm' : 'text-encr-400 hover:text-encr-700 dark:hover:text-encr-200'}`}
              >
                {t === 'login' ? (
                  <><Lock size={14} /> <span>Sign In</span></>
                ) : (
                  <><User size={14} /> <span>Create Account</span></>
                )}
              </button>

            ))}
          </div>

          
          <div className="glass-card rounded-t-2xl p-8">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  {/*Place the image at the center*/}                  
                  <img src={image1} alt="Welcome" className='w-20 h-20 object-contain mx-auto'/>
                  <div className="text-encr-900 dark:text-encr-100 font-display text-2xl font-bold mb-1">Welcome back</div>
                  <div className="text-encr-400 text-sm">Sign in to your secure channel</div>
                </div>

                {/* Toggle login method */}
                <div className="flex gap-2">
                  {['username','phone'].map(m => (
                    <button type="button" key={m} onClick={() => setLoginBy(m)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 hover:cursor-pointer hover:opacity-60 rounded-lg text-xs font-medium border transition-all
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
                  <div className="text-encr-900 dark:text-encr-100 font-display text-2xl font-bold mb-1">Join Urugwiro</div>
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

                {/* Profile photo */}
                <div className="space-y-2">
                  <label className="text-encr-400 text-xs font-medium">Profile photo (optional)</label>
                  <div className="flex items-center gap-4">
                    <button type="button"
                      onClick={() => { if (otpVerified) fileInputRef.current?.click() }}
                      className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-encr-100 dark:bg-encr-800 border-2 border-dashed border-encr-300 dark:border-encr-600 hover:border-accent transition-colors flex items-center justify-center disabled:opacity-50">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={20} className="text-encr-400" />
                      )}
                    </button>
                    <p className="text-xs text-encr-400 leading-relaxed">
                      {avatarPreview ? 'Looks good — click to change it.' : 'Click the circle to add a photo. You can skip this.'}
                    </p>
                    <input ref={fileInputRef} type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden" onChange={handleAvatarPick} />
                  </div>
                </div>

                {/* Institutional role */}
                <div className="space-y-2">
                  <label className="text-encr-400 text-xs font-medium">Institutional role</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-9 cursor-pointer disabled:opacity-60"
                      value={form.org_role}
                      disabled={!otpVerified || !!form.org_role} // locked once OTP fills it
                      onChange={e => setForm(f => ({ ...f, org_role: e.target.value, org_role_detail: '' }))}
                      required>
                      <option value="">Select your role…</option>
                      {['Minister','Senator','Deputy','Governor','Mayor',
                        'Director General','Permanent Secretary','Other'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-encr-400 pointer-events-none"/>
                  </div>
                  {/* "Other" free-text — only shown when user picks it themselves (OTP didn't lock a role) */}
                  {form.org_role === 'Other' && !form.org_role_detail && (
                    <input
                      className="input-field"
                      placeholder="Describe your role"
                      value={form.org_role_detail}
                      onChange={e => setForm(f => ({ ...f, org_role_detail: e.target.value }))}
                      disabled={!otpVerified}
                      required
                    />
                  )}
                  {/* Show the locked role as a read-only badge when OTP pre-filled it */}
                  {form.org_role && otpVerified && (
                    <div className="flex items-center gap-1.5 text-xs text-accent">
                      <UserCheck size={12}/>
                      Role assigned by your invite code
                    </div>
                  )}
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

            {/* OTP modal expiry warning */}
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-5">
            <Clock size={16} className="text-amber-400 flex-shrink-0" />
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