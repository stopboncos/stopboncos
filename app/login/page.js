'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)
  const [emailFocus, setEmailFocus] = useState(false)
  const [nameFocus, setNameFocus] = useState(false)


  const terjemahkanError = (msg) => {
    if (!msg) return 'Terjadi kesalahan, coba lagi ya 🙏'
    const m = msg.toLowerCase()
    if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
      return 'Email atau password salah. Coba cek lagi ya 😊'
    if (m.includes('email not confirmed'))
      return 'Email kamu belum dikonfirmasi. Cek inbox atau folder spam ya!'
    if (m.includes('user already registered') || m.includes('already registered'))
      return 'Email ini sudah terdaftar. Coba masuk aja langsung!'
    if (m.includes('password should be at least'))
      return 'Password minimal 6 karakter ya.'
    if (m.includes('unable to validate email address') || m.includes('invalid email'))
      return 'Format email tidak valid. Cek lagi ya!'
    if (m.includes('too many requests') || m.includes('rate limit'))
      return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi 🙏'
    if (m.includes('network') || m.includes('fetch'))
      return 'Koneksi bermasalah. Cek internet kamu ya!'
    if (m.includes('weak password'))
      return 'Password terlalu lemah. Coba kombinasi huruf dan angka.'
    return 'Terjadi kesalahan, coba lagi ya 🙏'
  }

  const handleAuth = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    if (!email || !password || (!isLogin && !fullName)) {
      setError('Semua field wajib diisi ya 😊')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(terjemahkanError(error.message))
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) setError(terjemahkanError(error.message))
      else setSuccessMessage('ok')
    }
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAuth()
  }

  const inputStyle = (focused) => ({
    width: '100%',
    padding: '13px 16px',
    border: `1.5px solid ${focused ? '#5B5F97' : '#E8E3F5'}`,
    borderRadius: '12px',
    fontSize: '15px',
    background: focused ? '#fff' : '#FDFCFF',
    color: '#1E1A3A',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '50px',
    WebkitAppearance: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(91,95,151,0.12)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  })

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #2D2B6B 0%, #4B4A8F 40%, #6B5FA5 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px 48px',
      boxSizing: 'border-box',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        borderRadius: '24px',
        border: '1px solid rgba(91,95,151,0.1)',
        boxShadow: '0 8px 48px rgba(30,26,58,0.25), 0 2px 8px rgba(30,26,58,0.1)',
        padding: '32px 24px 36px',
        boxSizing: 'border-box',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="Stopboncos" style={{ height: '60px', width: 'auto', margin: 'auto', marginBottom: '8px' }} />
          {/* <p style={{ color: '#8B7FA8', fontSize: '13px', margin: 0, letterSpacing: '0.01em' }}>
            Pencatatan Keuangan Pribadi
          </p> */}
        </div>

        {successMessage ? (
          /* Success State */
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <span style={{ fontSize: '52px', lineHeight: 1, marginBottom: '12px', display: 'block' }}>🎉</span>
            <div style={{
              display: 'inline-block',
              background: '#F0FDF4', color: '#15803D',
              border: '1px solid #86EFAC',
              borderRadius: '20px', fontSize: '11px', fontWeight: '600',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '4px 12px', marginBottom: '14px',
            }}>Pendaftaran berhasil</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1E1A3A', margin: '0 0 8px', lineHeight: 1.3 }}>
              Yeay, akun kamu<br />berhasil dibuat!
            </h2>
            <p style={{ fontSize: '14px', color: '#6B5FA5', margin: '0 0 20px', lineHeight: 1.6 }}>
              Cek inbox email kamu dan klik link konfirmasi untuk mulai pakai Stopboncos.
            </p>
            <div style={{
              background: '#F9F6FF', border: '1px solid #E8E3F5',
              borderRadius: '10px', padding: '11px 14px',
              fontSize: '13px', color: '#8B7FA8',
              marginBottom: '24px', lineHeight: 1.5,
            }}>
              📬 Belum masuk? Cek folder <strong>spam</strong> juga ya 😄
            </div>
            <button
              onClick={() => { setIsLogin(true); setSuccessMessage('') }}
              style={{
                width: '100%', padding: '14px',
                border: '1.5px solid #5B5F97', borderRadius: '14px',
                fontSize: '15px', fontWeight: '600',
                cursor: 'pointer', background: 'transparent', color: '#5B5F97',
                minHeight: '52px',
              }}
            >
              Masuk ke halaman login →
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              background: '#F3F0FA',
              borderRadius: '14px',
              padding: '4px',
              marginBottom: '24px',
              gap: '4px',
            }}>
              {['Masuk', 'Daftar'].map((label, i) => {
                const active = isLogin ? i === 0 : i === 1
                return (
                  <button key={label}
                    onClick={() => { setIsLogin(i === 0); setError('') }}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: 'none', borderRadius: '10px',
                      fontSize: '14px', fontWeight: active ? '600' : '500',
                      cursor: 'pointer',
                      background: active ? 'white' : 'transparent',
                      color: active ? '#5B5F97' : '#8B7FA8',
                      boxShadow: active ? '0 2px 8px rgba(91,95,151,0.15)' : 'none',
                      transition: 'all 0.2s',
                      minHeight: '44px',
                    }}
                  >{label}</button>
                )
              })}
            </div>

            {/* Nama Lengkap */}
            {!isLogin && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4A4570', marginBottom: '7px' }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setNameFocus(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Andi Pratama"
                  autoComplete="name"
                  style={inputStyle(nameFocus)}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4A4570', marginBottom: '7px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                onKeyDown={handleKeyDown}
                placeholder="nama@email.com"
                autoComplete="email"
                inputMode="email"
                style={inputStyle(emailFocus)}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4A4570', marginBottom: '7px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Min. 6 karakter"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  style={{ ...inputStyle(pwFocus), paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '18px', padding: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '32px', minHeight: '32px',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: '10px', padding: '11px 13px',
                marginBottom: '16px', fontSize: '13px', color: '#B91C1C', lineHeight: 1.4,
              }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleAuth}
              disabled={loading}
              style={{
                width: '100%', padding: '15px',
                border: 'none', borderRadius: '14px',
                fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: '#F97316', color: 'white',
                boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                minHeight: '52px', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'opacity 0.2s, transform 0.1s',
              }}
            >
              {loading && (
                <span style={{
                  width: '18px', height: '18px', flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: 'white', borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
              {loading ? 'Memproses...' : isLogin ? 'Masuk Sekarang' : 'Buat Akun'}
            </button>

            {/* Spinner keyframe — minimal, satu-satunya style tag */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
        © {new Date().getFullYear()} Stopboncos · Dibuat dengan ❤️
      </p>
    </div>
  )
}