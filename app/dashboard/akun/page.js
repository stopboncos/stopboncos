export const dynamic = 'force-dynamic'
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TIPE_AKUN = ['Rekening Bank', 'Dompet Digital', 'Kas', 'Investasi', 'Kartu Kredit']
const WARNA = ['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6']

export default function AkunPage() {
  const [akuns, setAkuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'Rekening Bank',
    balance: '', color: '#5B5F97', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchAkun() }, [])

  const fetchAkun = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setAkuns(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name) { setError('Nama akun wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      color: form.color,
      notes: form.notes,
    })
    if (error) {
      setError(error.message + ' | code: ' + error.code)
    } else {
      setShowModal(false)
      setForm({ name: '', type: 'Rekening Bank', balance: '', color: '#5B5F97', notes: '' })
      fetchAkun()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus akun ini?')) return
    await supabase.from('accounts').delete().eq('id', id)
    fetchAkun()
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(n)

  const totalSaldo = akuns.reduce((sum, a) => sum + (a.balance || 0), 0)

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '24px',
        gap: '12px', flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Akun Dompet</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Total saldo: <strong style={{ color: 'var(--text)' }}>{fmt(totalSaldo)}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '9px 18px', background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '13.5px',
            fontWeight: '600', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap'
          }}
        >+ Tambah Dompet</button>
      </div>

      {/* Akun Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : akuns.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px',
          background: 'var(--bg-card)', borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👛</div>
          <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada akun</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tambah dompet pertama Anda</div>
        </div>
      ) : (
        <div className="akun-grid">
          {akuns.map(akun => (
            <div key={akun.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px',
              borderTop: `4px solid ${akun.color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)', wordBreak: 'break-word' }}>{akun.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{akun.type}</div>
                </div>
                <button
                    onClick={() => handleDelete(akun.id)}
                    style={{
                        background: 'none', color: 'var(--danger)',
                        border: 'none', padding: '4px',
                        cursor: 'pointer', flexShrink: 0, lineHeight: 1
                    }}
                    >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    </button>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>
                {fmt(akun.balance)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Saldo saat ini</div>
              {akun.notes && (
                <div style={{
                  marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)',
                  background: 'var(--bg)', borderRadius: '6px', padding: '6px 10px',
                  wordBreak: 'break-word'
                }}>{akun.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '16px'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            width: '440px', maxWidth: '100%',
            padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Tambah Dompet</h2>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', fontSize: '20px',
                cursor: 'pointer', color: 'var(--text-muted)'
              }}>×</button>
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-light)', color: 'var(--danger)',
                padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
              }}>{error}</div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Akun *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="mis. BCA Utama, GoPay, Kas"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '14px', background: 'var(--bg)',
                  color: 'var(--text)', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tipe Akun</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '14px', background: 'var(--bg)',
                  color: 'var(--text)', boxSizing: 'border-box'
                }}
              >
                {TIPE_AKUN.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Saldo Awal (Rp)</label>
              <input
                type="number"
                value={form.balance}
                onChange={e => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '14px', background: 'var(--bg)',
                  color: 'var(--text)', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Warna</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {WARNA.map(w => (
                  <div
                    key={w}
                    onClick={() => setForm({ ...form, color: w })}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: w, cursor: 'pointer',
                      border: form.color === w ? '3px solid var(--text)' : '3px solid transparent',
                      transition: 'border 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Catatan (opsional)</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="mis. Untuk kebutuhan sehari-hari"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '14px', background: 'var(--bg)',
                  color: 'var(--text)', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '9px 18px', background: 'var(--bg)',
                  color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer'
                }}
              >Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 18px', background: 'var(--primary)',
                  color: 'white', border: 'none',
                  borderRadius: '8px', fontSize: '13.5px',
                  fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >{saving ? 'Menyimpan...' : 'Simpan Akun'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}