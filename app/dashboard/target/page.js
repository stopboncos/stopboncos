'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PERIODE = ['Bulanan', 'Mingguan', 'Tahunan']

export default function TargetPage() {
  const [targets, setTargets] = useState([])
  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category_id: '', quota: '', period: 'Bulanan', warning_pct: 80, start_date: new Date().toISOString().slice(0, 7) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: t }, { data: k }] = await Promise.all([
      supabase.from('targets').select('*, categories(name, icon, color)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense')
    ])
    setTargets(t || [])
    setKategori(k || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.category_id) { setError('Pilih kategori dulu'); return }
    if (!form.quota) { setError('Kuota wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('targets').insert({
      user_id: user.id,
      category_id: form.category_id,
      quota: parseFloat(form.quota),
      period: form.period,
      warning_pct: parseInt(form.warning_pct),
      start_date: form.start_date + '-01',
    })
    if (error) setError(error.message)
    else {
      setShowModal(false)
      setForm({ category_id: '', quota: '', period: 'Bulanan', warning_pct: 80, start_date: new Date().toISOString().slice(0, 7) })
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus target ini?')) return
    await supabase.from('targets').delete().eq('id', id)
    fetchData()
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const getPct = (spent, quota) => Math.min(Math.round((spent / quota) * 100), 100)
  const getStatus = (pct, warning) => {
    if (pct >= 100) return { label: 'Melebihi kuota', color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (pct >= warning) return { label: 'Hampir habis', color: 'var(--accent)', bg: 'var(--accent-light)' }
    return { label: 'Aman', color: '#22C55E', bg: '#F0FDF4' }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Target & Kuota Pengeluaran</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{targets.length} target aktif</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: '9px 18px', background: 'var(--primary)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer'
        }}>+ Tambah Target</button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : targets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
          <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada target</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Buat target pengeluaran per kategori</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {targets.map(target => {
            const spent = 0 // nanti diisi dari transaksi
            const pct = getPct(spent, target.quota)
            const status = getStatus(pct, target.warning_pct)
            return (
              <div key={target.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: (target.categories?.color || '#5B5F97') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                    }}>{target.categories?.icon || '🎯'}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>{target.categories?.name || 'Kategori'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{target.period} · Peringatan di {target.warning_pct}%</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: status.color, background: status.bg, padding: '4px 10px', borderRadius: '20px' }}>
                      {status.label}
                    </span>
                    <button onClick={() => handleDelete(target.id)} style={{
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      border: 'none', borderRadius: '6px', padding: '5px 10px',
                      cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                    }}>Hapus</button>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px', transition: 'width 0.5s ease',
                      width: pct + '%',
                      background: pct >= 100 ? 'var(--danger)' : pct >= target.warning_pct ? 'var(--accent)' : 'var(--primary)'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Terpakai: <strong style={{ color: 'var(--text)' }}>{fmt(spent)}</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>Kuota: <strong style={{ color: 'var(--text)' }}>{fmt(target.quota)}</strong></span>
                </div>
              </div>
            )
          })}
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Tambah Target</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            {kategori.length === 0 && (
              <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠ Belum ada kategori pengeluaran. Buat kategori dulu.
              </div>
            )}

            {/* Kategori */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kategori *</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{
                width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box'
              }}>
                <option value="">Pilih kategori...</option>
                {kategori.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>

            {/* Kuota */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kuota Maksimal (Rp) *</label>
              <input type="number" value={form.quota} onChange={e => setForm({ ...form, quota: e.target.value })} placeholder="0" style={{
                width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box'
              }} />
            </div>

            {/* Periode & Mulai */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Periode</label>
                <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} style={{
                  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                  borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box'
                }}>
                  {PERIODE.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Mulai</label>
                <input type="month" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={{
                  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                  borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box'
                }} />
              </div>
            </div>

            {/* Warning */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                Peringatan di (%) — sekarang: {form.warning_pct}%
              </label>
              <input type="range" min="50" max="95" step="5" value={form.warning_pct}
                onChange={e => setForm({ ...form, warning_pct: e.target.value })}
                style={{ width: '100%' }} />
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
              }}>{saving ? 'Menyimpan...' : 'Simpan Target'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}