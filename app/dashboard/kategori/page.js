'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const COLORS = ['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899']

const SIMPLE_ICONS = ['🍽️', '🚌', '🛍️', '🎮', '💊', '📚', '☕', '🏠', '💡', '📱', '✈️', '🎵', '💼', '📈', '💰', '🎁']

const ICON_GROUPS = [
  { label: 'Makanan & Minuman', icons: ['🍽️','🍔','🍕','🍜','🍱','🍣','🍛','🥗','🥩','🍗','🥚','🧆','🌮','🌯','🥪','🍞','🧁','🎂','🍰','🍩','🍪','🍫','🍬','🍭','☕','🧋','🍵','🥤','🧃','🍺','🍷','🥛','🧊'] },
  { label: 'Transportasi', icons: ['🚌','🚗','🏍️','🚕','🚙','🚎','🚐','🚑','🚒','🚂','✈️','🚢','🛵','🚲','🛺','⛽','🅿️','🛣️'] },
  { label: 'Rumah & Utilitas', icons: ['🏠','🏡','🏢','💡','🔌','🚿','🛁','🪑','🛋️','🪴','🧹','🧺','🪣','🔑','🚪','🛏️','🧯','📦'] },
  { label: 'Belanja', icons: ['🛍️','👗','👠','👟','👜','🎒','🧣','🧤','🧥','👒','💍','💎','🛒','🏪','🏬'] },
  { label: 'Hiburan', icons: ['🎮','🎵','🎬','🎭','🎨','🎤','🎧','🎯','🎲','🎰','🎳','🎻','🎹','🎸','📺','📸','🎟️','🎪'] },
  { label: 'Kesehatan', icons: ['💊','🏥','🩺','🩻','💉','🩹','🧬','🫀','🧘','🏋️','🚴','🤸','🧖','😷'] },
  { label: 'Pendidikan', icons: ['📚','📖','📝','✏️','🖊️','📐','📏','🎓','🏫','🔬','🔭','💻','🖥️','📊','📋'] },
  { label: 'Pekerjaan & Keuangan', icons: ['💼','📈','📉','💰','💳','💵','🏦','🪙','🖨️','📠','📟','🗂️','📁','🤝'] },
  { label: 'Perjalanan', icons: ['🗺️','🧳','🏖️','🏔️','🏕️','🗼','🏯','🏟️','🗽','🌋','🏝️','⛺','🎑','🌅','🌄'] },
  { label: 'Lain-lain', icons: ['🎁','🎀','🪄','🧸','🪆','🖼️','🪞','🧲','🔧','🪛','🔨','🧰','⚙️','📌','📎','🔗','🪝','🌟','❤️','🙏','👏','✅','⚡','🔔'] },
]

const findGroupForIcon = (icon) => {
  const idx = ICON_GROUPS.findIndex(g => g.icons.includes(icon))
  return idx >= 0 ? idx : 0
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
  borderRadius: '8px', fontSize: '14px', background: 'var(--bg)',
  color: 'var(--text)', boxSizing: 'border-box',
}

// ── Komponen accordion icon untuk modal edit ──────────────────
function EditModalForm({ editForm, setEditForm, openGroup, setOpenGroup }) {
  return (
    <>
      {/* Tipe */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tipe</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ key: 'expense', label: 'Pengeluaran' }, { key: 'income', label: 'Pemasukan' }].map(t => (
            <button key={t.key} onClick={() => setEditForm({ ...editForm, type: t.key })} style={{
              flex: 1, padding: '8px', border: '1px solid',
              borderColor: editForm.type === t.key ? 'var(--primary)' : 'var(--border)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: editForm.type === t.key ? 'var(--primary-light)' : 'transparent',
              color: editForm.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Nama */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Kategori *</label>
        <input
          value={editForm.name}
          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
          placeholder="mis. Makan Siang, Bensin..."
          style={inputStyle}
        />
      </div>

      {/* Icon — preview read-only + accordion */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Icon</label>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 12px', border: '1px solid var(--border)',
          borderRadius: '8px', background: 'var(--bg)', marginBottom: '10px',
        }}>
          <span style={{ fontSize: '22px' }}>{editForm.icon}</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Icon aktif — pilih dari daftar di bawah</span>
        </div>

        {/* Accordion */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {ICON_GROUPS.map((group, gIdx) => (
            <div key={gIdx} style={{ borderBottom: gIdx < ICON_GROUPS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div
                onClick={() => setOpenGroup(openGroup === gIdx ? -1 : gIdx)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', cursor: 'pointer',
                  background: openGroup === gIdx ? 'var(--primary-light)' : 'var(--bg-card)',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: openGroup === gIdx ? '600' : '400', color: openGroup === gIdx ? 'var(--primary)' : 'var(--text)' }}>
                  {group.icons[0]} {group.label}
                </span>
                <span style={{
                  fontSize: '11px', color: 'var(--text-muted)',
                  display: 'inline-block',
                  transform: openGroup === gIdx ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>▼</span>
              </div>
              {openGroup === gIdx && (
                <div style={{ padding: '12px 14px', background: 'var(--bg)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.icons.map(icon => (
                    <div
                      key={icon}
                      onClick={() => setEditForm({ ...editForm, icon })}
                      style={{
                        width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                        border: '2px solid',
                        borderColor: editForm.icon === icon ? 'var(--primary)' : 'var(--border)',
                        background: editForm.icon === icon ? 'var(--primary-light)' : 'transparent',
                        transition: 'all 0.1s',
                      }}
                    >{icon}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
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
    </>
  )
}

// ── Halaman utama ─────────────────────────────────────────────
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

  // Modal edit
  const [showEditModal, setShowEditModal] = useState(false)
  const [editKat, setEditKat] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [openGroup, setOpenGroup] = useState(0)

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

  const handleSave = async () => {
    if (!form.name) { setError('Nama kategori wajib diisi'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('categories').insert({
      user_id: user.id, name: form.name, type: form.type, icon: form.icon, color: form.color,
    })
    if (error) setError(error.message)
    else {
      setShowModal(false)
      setForm({ name: '', type: 'expense', icon: '🍽️', color: '#5B5F97' })
      fetchKategori()
    }
    setSaving(false)
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Hapus kategori ini?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchKategori()
  }

  const openEditModal = (kat, e) => {
    e?.stopPropagation()
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
    const { error } = await supabase.from('categories').update({
      name: editForm.name, type: editForm.type, icon: editForm.icon, color: editForm.color,
    }).eq('id', editKat.id)
    if (error) setEditError(error.message)
    else {
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
                background: detailId === kat.id ? 'var(--primary-light)' : 'transparent',
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
                <button className="action-btn-mobile" onClick={(e) => handleDelete(kat.id, e)} style={{
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
                    color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            {/* Nama */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Nama Kategori *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="mis. Makan Siang, Bensin..." style={inputStyle} />
            </div>
            {/* Icon simple */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SIMPLE_ICONS.map(icon => (
                  <div key={icon} onClick={() => setForm({ ...form, icon })} style={{
                    width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    border: '2px solid', borderColor: form.icon === icon ? 'var(--primary)' : 'var(--border)',
                    background: form.icon === icon ? 'var(--primary-light)' : 'transparent',
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

      {/* Modal edit dengan accordion */}
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

            <EditModalForm
              editForm={editForm}
              setEditForm={setEditForm}
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
            />

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