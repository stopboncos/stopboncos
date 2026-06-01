export const dynamic = 'force-dynamic'
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ICONS = ['🍽️', '🚌', '🛍️', '🎮', '💊', '📚', '☕', '🏠', '💡', '📱', '✈️', '🎵', '💼', '📈', '💰', '🎁']
const COLORS = ['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899']

export default function KategoriPage() {
  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'expense', icon: '🍽️', color: '#5B5F97' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('expense')

  useEffect(() => { fetchKategori() }, [])

  const fetchKategori = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setKategori(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name) { setError('Nama kategori wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      icon: form.icon,
      color: form.color,
    })
    if (error) setError(error.message)
    else {
      setShowModal(false)
      setForm({ name: '', type: 'expense', icon: '🍽️', color: '#5B5F97' })
      fetchKategori()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus kategori ini?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchKategori()
  }

  const filtered = kategori.filter(k => k.type === activeTab)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Kategori</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            {kategori.filter(k => k.type === 'expense').length} pengeluaran · {kategori.filter(k => k.type === 'income').length} pemasukan
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: '9px 18px', background: 'var(--primary)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13.5px',
          fontWeight: '600', cursor: 'pointer'
        }}>+ Tambah</button>
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '20px' }}>
        {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
            borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
            marginBottom: '-2px', transition: 'all 0.15s'
          }}>{t.label}</div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px',
          background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏷️</div>
          <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada kategori</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tambah kategori pertama Anda</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {filtered.map((kat, i) => (
            <div key={kat.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: kat.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                }}>{kat.icon}</div>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>{kat.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {kat.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(kat.id)} style={{
                background: 'var(--danger-light)', color: 'var(--danger)',
                border: 'none', borderRadius: '6px', padding: '5px 10px',
                cursor: 'pointer', fontSize: '12px', fontWeight: '500'
              }}>Hapus</button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            width: '440px', maxWidth: '95vw', padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Tambah Kategori</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            {/* Tipe */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tipe</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
                  <button key={t.key} onClick={() => setForm({ ...form, type: t.key })} style={{
                    flex: 1, padding: '8px', border: '1px solid',
                    borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                    background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                    color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)'
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Nama */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Kategori *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="mis. Makan Siang, Bensin..."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>

            {/* Icon */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ICONS.map(icon => (
                  <div key={icon} onClick={() => setForm({ ...form, icon })} style={{
                    width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    border: '2px solid', borderColor: form.icon === icon ? 'var(--primary)' : 'var(--border)',
                    background: form.icon === icon ? 'var(--primary-light)' : 'transparent'
                  }}>{icon}</div>
                ))}
              </div>
            </div>

            {/* Warna */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Warna</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map(w => (
                  <div key={w} onClick={() => setForm({ ...form, color: w })} style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: w, cursor: 'pointer',
                    border: form.color === w ? '3px solid var(--text)' : '3px solid transparent'
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer'
              }}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '9px 18px', background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '13.5px',
                fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}