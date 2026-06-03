'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const PERIODE = ['Bulanan', 'Mingguan', 'Tahunan']

export default function TargetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [isMobile, setIsMobile] = useState(false)

  const [targets, setTargets] = useState([])
  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal tambah
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category_id: '', quota: '', period: 'Bulanan', warning_pct: 80, start_date: new Date().toISOString().slice(0, 7) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal edit (mobile)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Hapus target ini?')) return
    await supabase.from('targets').delete().eq('id', id)
    fetchData()
  }

  const openEditModal = (target, e) => {
    e?.stopPropagation()
    setEditTarget(target)
    setEditForm({
      category_id: target.category_id,
      quota: String(target.quota),
      period: target.period,
      warning_pct: target.warning_pct,
      start_date: target.start_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editForm.quota) { setEditError('Kuota wajib diisi'); return }
    setEditSaving(true)
    setEditError('')
    const { error } = await supabase.from('targets').update({
      category_id: editForm.category_id,
      quota: parseFloat(editForm.quota),
      period: editForm.period,
      warning_pct: parseInt(editForm.warning_pct),
      start_date: editForm.start_date + '-01',
    }).eq('id', editTarget.id)
    if (error) setEditError(error.message)
    else {
      setShowEditModal(false)
      fetchData()
    }
    setEditSaving(false)
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--bg)',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const modalForm = (formData, setFormData) => (
    <>
      {/* Kategori */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kategori *</label>
        <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} style={inputStyle}>
          <option value="">Pilih kategori...</option>
          {kategori.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
        </select>
      </div>
      {/* Kuota */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kuota Maksimal (Rp) *</label>
        <input type="number" value={formData.quota} onChange={e => setFormData({ ...formData, quota: e.target.value })} placeholder="0" style={inputStyle} />
      </div>
      {/* Periode & Mulai */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Periode</label>
          <select value={formData.period} onChange={e => setFormData({ ...formData, period: e.target.value })} style={inputStyle}>
            {PERIODE.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Mulai</label>
          <input type="month" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={inputStyle} />
        </div>
      </div>
      {/* Warning */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
          Peringatan di (%) — sekarang: {formData.warning_pct}%
        </label>
        <input type="range" min="50" max="95" step="5" value={formData.warning_pct}
          onChange={e => setFormData({ ...formData, warning_pct: e.target.value })}
          style={{ width: '100%' }} />
      </div>
    </>
  )

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
          {targets.map(target => (
            <div
              key={target.id}
              onClick={() => !isMobile && router.push(detailId === target.id ? '?' : `?detail=${target.id}`)}
              style={{
                background: detailId === target.id ? 'var(--primary-light)' : 'var(--bg-card)',
                border: detailId === target.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '12px', padding: '20px',
                cursor: isMobile ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                    background: (target.categories?.color || '#5B5F97') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                  }}>{target.categories?.icon || '🎯'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>{target.categories?.name || 'Kategori'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {target.period} · Kuota {fmt(target.quota)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Peringatan di {target.warning_pct}%
                    </div>
                  </div>
                </div>
                {/* Tombol edit & hapus — mobile only */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    className="action-btn-mobile"
                    onClick={(e) => openEditModal(target, e)}
                    style={{
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      border: 'none', borderRadius: '6px', padding: '5px 7px',
                      cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                    }}>✏️</button>
                  <button
                    className="action-btn-mobile"
                    onClick={(e) => handleDelete(target.id, e)}
                    style={{
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      border: 'none', borderRadius: '6px', padding: '5px 7px',
                      cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                    }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH */}
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
            {modalForm(form, setForm)}
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

      {/* MODAL EDIT (mobile) */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            width: '440px', maxWidth: '95vw', padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Edit Target</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {editError && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{editError}</div>}
            {modalForm(editForm, setEditForm)}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{
                padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer'
              }}>Batal</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{
                padding: '9px 18px', background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '13.5px',
                fontWeight: '600', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1
              }}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}