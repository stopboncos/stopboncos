'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

const PERIODE = ['Bulanan', 'Mingguan', 'Tahunan']

const logActivity = async (userId, entityType, entityId, action, oldData, newData) => {
  await supabase.from('activity_logs').insert({
    user_id: userId, entity_type: entityType, entity_id: entityId,
    action, old_data: oldData || null, new_data: newData || null,
  })
}

const upsertTargetHistory = async (userId, categoryId, quota, period, warningPct, isDeleted = false) => {
  const now = new Date()
  await supabase.from('target_history').upsert({
    user_id: userId, category_id: categoryId,
    quota, period, warning_pct: warningPct,
    bulan: now.getMonth() + 1, tahun: now.getFullYear(),
    is_deleted: isDeleted, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,category_id,bulan,tahun' })
}

export default function TargetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)

  // Target biasa
  const [targets, setTargets] = useState([])
  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(true)

  // Target harian
  const [dailyTarget, setDailyTarget] = useState(null)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const [dailyForm, setDailyForm] = useState({ quota: '', warning_pct: 80 })
  const [dailySaving, setDailySaving] = useState(false)
  const [dailyError, setDailyError] = useState('')
  const [isEditDaily, setIsEditDaily] = useState(false)

  // Modal tambah target biasa
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category_id: '', quota: '', period: 'Bulanan', warning_pct: 80, start_date: new Date().toISOString().slice(0, 7) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal edit target biasa (mobile)
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
    setUser(user)
    const [{ data: t }, { data: k }, { data: dt }] = await Promise.all([
      supabase.from('targets').select('*, categories(name, icon, color)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense'),
      supabase.from('daily_target').select('*').eq('user_id', user.id).single(),
    ])
    setTargets(t || [])
    setKategori(k || [])
    setDailyTarget(dt || null)
    setLoading(false)
  }

  // ── TARGET HARIAN ────────────────────────────────────────────

  const openDailyModal = (isEdit = false) => {
    setIsEditDaily(isEdit)
    setDailyError('')
    if (isEdit && dailyTarget) {
      setDailyForm({ quota: String(dailyTarget.quota), warning_pct: dailyTarget.warning_pct })
    } else {
      setDailyForm({ quota: '', warning_pct: 80 })
    }
    setShowDailyModal(true)
  }

  const handleDailySave = async () => {
    if (!dailyForm.quota) { setDailyError('Kuota wajib diisi'); return }
    setDailySaving(true)
    setDailyError('')
    const quota = parseFloat(dailyForm.quota)
    const warning_pct = parseInt(dailyForm.warning_pct)

    if (isEditDaily && dailyTarget) {
      const { error } = await supabase.from('daily_target').update({
        quota, warning_pct, updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
      if (error) { setDailyError(error.message); setDailySaving(false); return }
      await logActivity(user.id, 'target', dailyTarget.id, 'update',
        { type: 'harian', quota: dailyTarget.quota, warning_pct: dailyTarget.warning_pct },
        { type: 'harian', quota, warning_pct }
      )
    } else {
      const { data: inserted, error } = await supabase.from('daily_target').insert({
        user_id: user.id, quota, warning_pct,
      }).select().single()
      if (error) { setDailyError(error.message); setDailySaving(false); return }
      await logActivity(user.id, 'target', inserted.id, 'create', null,
        { type: 'harian', quota, warning_pct }
      )
    }

    setShowDailyModal(false)
    fetchData()
    setDailySaving(false)
  }

  const handleDailyDelete = async () => {
    if (!confirm('Hapus target harian ini?')) return
    await logActivity(user.id, 'target', dailyTarget.id, 'delete',
      { type: 'harian', quota: dailyTarget.quota, warning_pct: dailyTarget.warning_pct }, null
    )
    await supabase.from('daily_target').delete().eq('user_id', user.id)
    fetchData()
  }

  // ── TARGET BIASA ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.category_id) { setError('Pilih kategori dulu'); return }
    if (!form.quota) { setError('Kuota wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: inserted, error } = await supabase.from('targets').insert({
      user_id: user.id,
      category_id: form.category_id,
      quota: parseFloat(form.quota),
      period: form.period,
      warning_pct: parseInt(form.warning_pct),
      start_date: form.start_date + '-01',
    }).select().single()
    if (error) { setError(error.message); setSaving(false); return }
    await upsertTargetHistory(user.id, form.category_id, parseFloat(form.quota), form.period, parseInt(form.warning_pct))
    await logActivity(user.id, 'target', inserted.id, 'create', null, {
      category_id: form.category_id, quota: parseFloat(form.quota),
      period: form.period, warning_pct: parseInt(form.warning_pct),
    })
    setShowModal(false)
    setForm({ category_id: '', quota: '', period: 'Bulanan', warning_pct: 80, start_date: new Date().toISOString().slice(0, 7) })
    fetchData()
    setSaving(false)
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Hapus target ini?')) return
    const target = targets.find(t => t.id === id)
    if (target) {
      await upsertTargetHistory(user.id, target.category_id, target.quota, target.period, target.warning_pct, true)
      await logActivity(user.id, 'target', id, 'delete', {
        category_id: target.category_id, quota: target.quota, period: target.period, warning_pct: target.warning_pct,
      }, null)
    }
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
    if (error) { setEditError(error.message); setEditSaving(false); return }
    await upsertTargetHistory(user.id, editForm.category_id, parseFloat(editForm.quota), editForm.period, parseInt(editForm.warning_pct))
    await logActivity(user.id, 'target', editTarget.id, 'update',
      { category_id: editTarget.category_id, quota: editTarget.quota, period: editTarget.period, warning_pct: editTarget.warning_pct },
      { category_id: editForm.category_id, quota: parseFloat(editForm.quota), period: editForm.period, warning_pct: parseInt(editForm.warning_pct) }
    )
    setShowEditModal(false)
    fetchData()
    setEditSaving(false)
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--bg)',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const sectionLabel = (text) => (
    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px', marginTop: '4px' }}>
      {text}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Target</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Tetapkan target maksimal pengeluaranmu!</p>
        </div>

      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : (
        <>
          {/* ── SECTION HARIAN ── */}
          {sectionLabel('Target Harian')}
          {dailyTarget ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px', marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                  }}>📅</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Target Harian</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Kuota {fmt(dailyTarget.quota)} · Peringatan di {dailyTarget.warning_pct}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="action-btn-mobile"
                    onClick={() => openDailyModal(true)}
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="action-btn-mobile"
                    onClick={handleDailyDelete}
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px',
              background: 'var(--bg-card)', borderRadius: '12px',
              border: '1px dashed var(--border)', marginBottom: '24px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada target harian</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>Set batas pengeluaran harian untuk semua kategori</div>
              <button onClick={() => openDailyModal(false)} style={{
                padding: '8px 18px', background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}>+ Set Target Harian</button>
            </div>
          )}

          {/* ── SECTION TARGET BIASA ── */}
          {sectionLabel('Target Per Kategori')}
          {targets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
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
                    background: 'var(--bg-card)',
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
                          Kuota {fmt(target.quota)} · Peringatan di {target.warning_pct}%
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        className="action-btn-mobile"
                        onClick={(e) => openEditModal(target, e)}
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="action-btn-mobile"
                        onClick={(e) => handleDelete(target.id, e)}
                        style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tombol tambah target — semua device */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '13px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1.5px dashed var(--text-muted)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              opacity: 0.5,
              transition: 'opacity 0.15s, border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span>
            <span>Tambah Target Baru</span>
          </button>
        </>
      )}

      {/* MODAL TARGET HARIAN */}
      {showDailyModal && (
        <div onClick={() => setShowDailyModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '12px', width: '440px', maxWidth: '95vw', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>{isEditDaily ? 'Edit' : 'Set'} Target Harian</h2>
              <button onClick={() => setShowDailyModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {dailyError && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{dailyError}</div>}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                Kuota Maksimal per Hari (Rp) *
              </label>
              <input type="number" value={dailyForm.quota} onChange={e => setDailyForm({ ...dailyForm, quota: e.target.value })} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                Peringatan di (%) — sekarang: {dailyForm.warning_pct}%
              </label>
              <input type="range" min="50" max="95" step="5" value={dailyForm.warning_pct}
                onChange={e => setDailyForm({ ...dailyForm, warning_pct: e.target.value })}
                style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDailyModal(false)} style={{ padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleDailySave} disabled={dailySaving} style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: dailySaving ? 'not-allowed' : 'pointer', opacity: dailySaving ? 0.7 : 1 }}>{dailySaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH TARGET BIASA */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '12px', width: '440px', maxWidth: '95vw', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
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
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kategori *</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                <option value="">Pilih kategori...</option>
                {kategori.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kuota Maksimal (Rp) *</label>
              <input type="number" value={form.quota} onChange={e => setForm({ ...form, quota: e.target.value })} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Periode</label>
                <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} style={inputStyle}>
                  {PERIODE.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Mulai</label>
                <input type="month" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                Peringatan di (%) — sekarang: {form.warning_pct}%
              </label>
              <input type="range" min="50" max="95" step="5" value={form.warning_pct}
                onChange={e => setForm({ ...form, warning_pct: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Menyimpan...' : 'Simpan Target'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT TARGET BIASA (mobile) */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '12px', width: '440px', maxWidth: '95vw', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Edit Target</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {editError && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{editError}</div>}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kategori *</label>
              <select value={editForm.category_id} onChange={e => setEditForm({ ...editForm, category_id: e.target.value })} style={inputStyle}>
                <option value="">Pilih kategori...</option>
                {kategori.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kuota Maksimal (Rp) *</label>
              <input type="number" value={editForm.quota} onChange={e => setEditForm({ ...editForm, quota: e.target.value })} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Periode</label>
                <select value={editForm.period} onChange={e => setEditForm({ ...editForm, period: e.target.value })} style={inputStyle}>
                  {PERIODE.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Mulai</label>
                <input type="month" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                Peringatan di (%) — sekarang: {editForm.warning_pct}%
              </label>
              <input type="range" min="50" max="95" step="5" value={editForm.warning_pct}
                onChange={e => setEditForm({ ...editForm, warning_pct: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}