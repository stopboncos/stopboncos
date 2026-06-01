'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form nama
  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState(null)

  // Form password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(data)
      setFullName(data?.full_name || '')
    }
    setLoading(false)
  }

  const getInitial = () => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase()
    return '?'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const handleSaveName = async () => {
    setSavingName(true)
    setNameMsg(null)
    const { error } = await supabase.from('users').update({ full_name: fullName }).eq('id', user.id)
    if (error) {
      setNameMsg({ type: 'error', text: 'Gagal menyimpan nama.' })
    } else {
      setProfile(prev => ({ ...prev, full_name: fullName }))
      setNameMsg({ type: 'success', text: 'Nama berhasil disimpan.' })
    }
    setSavingName(false)
    setTimeout(() => setNameMsg(null), 3000)
  }

  const handleSavePassword = async () => {
    setPassMsg(null)
    if (!newPassword) return setPassMsg({ type: 'error', text: 'Password tidak boleh kosong.' })
    if (newPassword.length < 6) return setPassMsg({ type: 'error', text: 'Password minimal 6 karakter.' })
    if (newPassword !== confirmPassword) return setPassMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' })

    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPassMsg({ type: 'error', text: 'Gagal mengganti password.' })
    } else {
      setPassMsg({ type: 'success', text: 'Password berhasil diubah.' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPass(false)
    setTimeout(() => setPassMsg(null), 3000)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '13px' }}>Memuat...</div>
      </div>
    </div>
  )

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  }

  const labelStyle = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '13.5px',
    background: 'var(--bg)',
    color: 'var(--text)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const inputReadonlyStyle = {
    ...inputStyle,
    color: 'var(--text-muted)',
    cursor: 'default',
  }

  const btnPrimary = {
    padding: '10px 20px',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  }

  const msgStyle = (type) => ({
    fontSize: '12.5px',
    color: type === 'success' ? '#22C55E' : 'var(--danger)',
    marginTop: '10px',
  })

  const sectionTitle = (title, subtitle) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Profil</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Kelola informasi akun kamu</p>
      </div>

      {/* Avatar card — full width */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: '700', color: 'white',
          flexShrink: 0,
        }}>
          {getInitial()}
        </div>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>
            {profile?.full_name || <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '14px' }}>Belum ada nama</span>}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Bergabung sejak {formatDate(profile?.created_at)}
          </div>
        </div>
      </div>

      {/* 2-kolom grid untuk desktop, 1-kolom untuk mobile */}
      <div className="profil-grid">

        {/* KIRI — Informasi Akun */}
        <div style={cardStyle}>
          {sectionTitle('Informasi Akun')}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Nama Lengkap</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap..."
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Email</label>
            <input value={user?.email || ''} readOnly style={inputReadonlyStyle} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Password</label>
            <input value="••••••••" readOnly style={inputReadonlyStyle} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Tanggal Bergabung</label>
            <input value={formatDate(profile?.created_at)} readOnly style={inputReadonlyStyle} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleSaveName} disabled={savingName} style={{ ...btnPrimary, opacity: savingName ? 0.7 : 1 }}>
              {savingName ? 'Menyimpan...' : 'Simpan Nama'}
            </button>
            {nameMsg && <div style={{ fontSize: '12.5px', color: nameMsg.type === 'success' ? '#22C55E' : 'var(--danger)' }}>{nameMsg.text}</div>}
          </div>
        </div>

        {/* KANAN — Ganti Password + Koneksi Eksternal */}
        <div>

          {/* Ganti Password */}
          <div style={cardStyle}>
            {sectionTitle('Ganti Password', 'Password minimal 6 karakter')}

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  style={{ ...inputStyle, paddingRight: '40px' }}
                />
                <button onClick={() => setShowNew(!showNew)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)',
                }}>{showNew ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Konfirmasi Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  style={{ ...inputStyle, paddingRight: '40px' }}
                />
                <button onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)',
                }}>{showConfirm ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleSavePassword} disabled={savingPass} style={{ ...btnPrimary, opacity: savingPass ? 0.7 : 1 }}>
                {savingPass ? 'Menyimpan...' : 'Ganti Password'}
              </button>
              {passMsg && <div style={{ fontSize: '12.5px', color: passMsg.type === 'success' ? '#22C55E' : 'var(--danger)' }}>{passMsg.text}</div>}
            </div>
          </div>

          {/* Koneksi Eksternal */}
          <div style={cardStyle}>
            {sectionTitle('Koneksi Eksternal', 'ID untuk integrasi layanan eksternal')}

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Sheet ID</label>
              <input
                value={profile?.sheet_id || ''}
                readOnly
                placeholder="Belum dikonfigurasi"
                style={inputReadonlyStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Telegram Chat ID</label>
              <input
                value={profile?.telegram_chat_id || ''}
                readOnly
                placeholder="Belum dikonfigurasi"
                style={inputReadonlyStyle}
              />
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .profil-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        @media (min-width: 768px) {
          .profil-grid {
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            align-items: start;
          }
        }
      `}</style>
    </div>
  )
}