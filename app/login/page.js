export const dynamic = 'force-dynamic'
'use client'

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

  const handleAuth = async () => {
    setLoading(true)
    setError('')

    if (isLogin) {
      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      // Register
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Simpan data user ke tabel users
        await supabase.from('users').insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
        })
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAF7F5'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid #E0D5CF',
        width: '400px',
        maxWidth: '95vw'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img className="app-logo-lg" src="/logo.svg" alt="Stopboncos" />
          <p style={{ color: '#7A6876', fontSize: '14px', margin: '4px 0 0' }}>
            Pencatatan Keuangan Pribadi
          </p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E0D5CF', marginBottom: '24px' }}>
          <button onClick={() => setIsLogin(true)} style={{
            flex: 1, padding: '10px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontWeight: '500', fontSize: '14px',
            borderBottom: isLogin ? '2px solid #E8547A' : 'none',
            color: isLogin ? '#E8547A' : '#7A6876', marginBottom: '-2px'
          }}>Masuk</button>
          <button onClick={() => setIsLogin(false)} style={{
            flex: 1, padding: '10px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontWeight: '500', fontSize: '14px',
            borderBottom: !isLogin ? '2px solid #E8547A' : 'none',
            color: !isLogin ? '#E8547A' : '#7A6876', marginBottom: '-2px'
          }}>Daftar</button>
        </div>

        {/* Form */}
        {!isLogin && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Andi Pratama"
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid #E0D5CF',
                borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nama@email.com"
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid #E0D5CF',
              borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 karakter"
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid #E0D5CF',
              borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#FEECEC', color: '#C23838', padding: '10px 12px',
            borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          style={{
            width: '100%', padding: '11px', background: '#E8547A', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Memproses...' : isLogin ? 'Masuk' : 'Buat Akun'}
        </button>
      </div>
    </div>
  )
}