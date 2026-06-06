'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconPicker, findGroupForIcon } from '@/components/IconPicker'

const COLORS = ['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899']

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
  borderRadius: '8px', fontSize: '14px', background: 'var(--bg)',
  color: 'var(--text)', boxSizing: 'border-box',
}

const logActivity = async (userId, entityType, entityId, action, oldData, newData) => {
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId, entity_type: entityType, entity_id: entityId,
    action, old_data: oldData || null, new_data: newData || null,
  })
  if (error) console.error('logActivity error:', error)
}

export default function KategoriPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [isMobile, setIsMobile] = useState(false)
  

  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('expense')

  // Modal tambah
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'expense', icon: '🍽️', color: '#5B5F97' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal edit (mobile)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editKat, setEditKat] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  
  const [editTxCount, setEditTxCount] = useState(0) // jumlah transaksi kategori ini

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchKategori() }, [])

  const fetchKategori = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setKategori(data || [])
    setLoading(false)
  }

  const checkTxCount = async (categoryId) => {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
    return count || 0
  }

  const handleSave = async () => {
    if (!form.name) { setError('Nama kategori wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: inserted, error } = await supabase.from('categories').insert({
      user_id: user.id, name: form.name, type: form.type, icon: form.icon, color: form.color,
    }).select().single()
    if (error) {
      setError(error.message)
    } else {
      await logActivity(user.id, 'kategori', inserted.id, 'create', null, {
        name: form.name, type: form.type, icon: form.icon, color: form.color,
      })
      setShowModal(false)
      setForm({ name: '', type: 'expense', icon: '🍽️', color: '#5B5F97' })
      fetchKategori()
    }
    setSaving(false)
  }

  const handleDelete = async (kat, e) => {
    e?.stopPropagation()
    // Cek transaksi
    const count = await checkTxCount(kat.id)
    if (count > 0) {
      alert(`Tidak bisa dihapus — kategori ini masih digunakan di ${count} transaksi.`)
      return
    }
    if (!confirm('Hapus kategori ini?')) return
    const { data: { user } } = await supabase.auth.getUser()
    await logActivity(user.id, 'kategori', kat.id, 'delete', {
      name: kat.name, type: kat.type, icon: kat.icon, color: kat.color,
    }, null)
    await supabase.from('categories').delete().eq('id', kat.id)
    fetchKategori()
  }

  const openEditModal = async (kat, e) => {
    e?.stopPropagation()
    const count = await checkTxCount(kat.id)
    setEditTxCount(count)
    setEditKat(kat)
    setEditForm({ name: kat.name, type: kat.type, icon: kat.icon || '🍽️', color: kat.color || '#5B5F97' })
    setOpenGroup(findGroupForIcon(kat.icon || '🍽️'))
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editForm.name) { setEditError('Nama kategori wajib diisi'); return }
    setEditSaving(true)
    setEditError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('categories').update({
      name: editForm.name, type: editForm.type, icon: editForm.icon, color: editForm.color,
    }).eq('id', editKat.id)
    if (error) {
      setEditError(error.message)
    } else {
      await logActivity(user.id, 'kategori', editKat.id, 'update', {
        name: editKat.name, type: editKat.type, icon: editKat.icon, color: editKat.color,
      }, {
        name: editForm.name, type: editForm.type, icon: editForm.icon, color: editForm.color,
      })
      setShowEditModal(false)
      fetchKategori()
    }
    setEditSaving(false)
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
          border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer',
        }}>+ Tambah</button>
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '20px' }}>
        {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
            borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}>{t.label}</div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏷️</div>
          <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada kategori</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tambah kategori pertama Anda</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {filtered.map((kat, i) => (
            <div
              key={kat.id}
              onClick={() => !isMobile && router.push(detailId === kat.id ? '?' : `?detail=${kat.id}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: detailId === kat.id ? 'var(--pilih)' : 'transparent',
                cursor: isMobile ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: kat.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>{kat.icon}</div>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>{kat.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {kat.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button className="action-btn-mobile" onClick={(e) => openEditModal(kat, e)} style={{
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  border: 'none', borderRadius: '6px', padding: '5px 7px',
                  cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                }}>✏️</button>
                <button className="action-btn-mobile" onClick={(e) => handleDelete(kat, e)} style={{
                  background: 'var(--danger-light)', color: 'var(--danger)',
                  border: 'none', borderRadius: '6px', padding: '5px 7px',
                  cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal tambah */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            width: '440px', maxWidth: '95vw', padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Tambah Kategori</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tipe</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
                  <button key={t.key} onClick={() => setForm({ ...form, type: t.key })} style={{
                    flex: 1, padding: '8px', border: '1px solid',
                    borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                    background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                    color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Kategori *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="mis. Makan Siang, Bensin..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Icon</label>
              <IconPicker
                selectedIcon={form.icon}
                onSelect={(icon) => setForm({ ...form, icon })}
                
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Warna</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map(w => (
                  <div key={w} onClick={() => setForm({ ...form, color: w })} style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: w, cursor: 'pointer',
                    border: form.color === w ? '3px solid var(--text)' : '3px solid transparent',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit dengan accordion (mobile) */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            width: '480px', maxWidth: '95vw', padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Edit Kategori</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {editError && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{editError}</div>}

            {/* Tipe — locked kalau ada transaksi */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tipe</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
                  <button
                    key={t.key}
                    onClick={() => editTxCount === 0 && setEditForm({ ...editForm, type: t.key })}
                    style={{
                      flex: 1, padding: '8px', border: '1px solid',
                      borderColor: editForm.type === t.key ? 'var(--primary)' : 'var(--border)',
                      borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                      background: editForm.type === t.key ? 'var(--primary-light)' : 'transparent',
                      color: editForm.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: editTxCount > 0 ? 'not-allowed' : 'pointer',
                      opacity: editTxCount > 0 && editForm.type !== t.key ? 0.4 : 1,
                    }}
                  >{t.label}</button>
                ))}
              </div>
              {editTxCount > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  ⚠ Tipe tidak bisa diubah — kategori ini digunakan di {editTxCount} transaksi
                </div>
              )}
            </div>

            {/* Nama */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Kategori *</label>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="mis. Makan Siang, Bensin..." style={inputStyle} />
            </div>

            {/* Icon accordion */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Icon</label>
              <IconPicker
                selectedIcon={editForm.icon}
                onSelect={(icon) => setEditForm({ ...editForm, icon })}
                
              />
            </div>

            {/* Warna */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Warna</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map(w => (
                  <div key={w} onClick={() => setEditForm({ ...editForm, color: w })} style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: w, cursor: 'pointer',
                    border: editForm.color === w ? '3px solid var(--text)' : '3px solid transparent',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '9px 18px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13.5px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}