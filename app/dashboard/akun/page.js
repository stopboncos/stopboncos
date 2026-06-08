'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const TIPE_AKUN = ['Rekening Bank', 'Dompet Digital', 'Kas', 'Investasi', 'Kartu Kredit']
const WARNA = ['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6']

const ICON_BY_TYPE = {
  'Rekening Bank': (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="8" width="20" height="13" rx="2" fill={color} opacity="0.15"/>
      <rect x="2" y="8" width="20" height="13" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M2 11h20" stroke={color} strokeWidth="1.5"/>
      <path d="M12 3L2 8h20L12 3z" fill={color} opacity="0.3"/>
      <path d="M12 3L2 8h20L12 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="6" y="14" width="3" height="2" rx="0.5" fill={color}/>
    </svg>
  ),
  'Dompet Digital': (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="3" fill={color} opacity="0.15"/>
      <rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth="1.5"/>
      <path d="M15 13a1 1 0 100-2 1 1 0 000 2z" fill={color}/>
      <path d="M2 10h20" stroke={color} strokeWidth="1.5"/>
      <path d="M6 6V4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 6V4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Kas': (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="7" width="22" height="14" rx="2" fill={color} opacity="0.15"/>
      <rect x="1" y="7" width="22" height="14" rx="2" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="14" r="3" stroke={color} strokeWidth="1.5"/>
      <circle cx="5" cy="14" r="1" fill={color}/>
      <circle cx="19" cy="14" r="1" fill={color}/>
      <path d="M5 4h14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Investasi': (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 7 22 7 22 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="19" width="20" height="2" rx="1" fill={color} opacity="0.3"/>
    </svg>
  ),
  'Kartu Kredit': (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" fill={color} opacity="0.15"/>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5"/>
      <path d="M2 9h20" stroke={color} strokeWidth="1.5"/>
      <path d="M2 13h20" stroke={color} strokeWidth="1.5"/>
      <rect x="6" y="15" width="4" height="1.5" rx="0.75" fill={color}/>
      <rect x="12" y="15" width="2" height="1.5" rx="0.75" fill={color}/>
    </svg>
  ),
}

const getIcon = (type, color) => {
  const fn = ICON_BY_TYPE[type] || ICON_BY_TYPE['Kas']
  return fn(color)
}

const logActivity = async (userId, entityType, entityId, action, oldData, newData) => {
  await supabase.from('activity_logs').insert({
    user_id: userId, entity_type: entityType, entity_id: entityId,
    action, old_data: oldData || null, new_data: newData || null,
  })
}

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function AkunPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [akuns, setAkuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // Modal tambah akun
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Rekening Bank', balance: '', color: '#5B5F97', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal edit akun
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Modal top-up saldo
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupTarget, setTopupTarget] = useState(null)
  const getLocalDate = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const [topupForm, setTopupForm] = useState({ jumlah: '', sumber: '', catatan: '', tanggal: getLocalDate() })
  const [topupSaving, setTopupSaving] = useState(false)
  const [topupError, setTopupError] = useState('')

  // Net change per akun
  const [netChanges, setNetChanges] = useState({})

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)
    await fetchAkun(user.id)
  }

  const fetchAkun = async (uid) => {
    setLoading(true)
    const id = uid || userId
    const { data } = await supabase.from('accounts').select('*').eq('user_id', id).order('created_at', { ascending: false })
    const accounts = data || []
    setAkuns(accounts)
    await fetchNetChanges(accounts)
    setLoading(false)
  }

  // ✅ FIX: Hitung net change dengan benar termasuk transaksi transfer
  const fetchNetChanges = async (accounts) => {
    if (!accounts.length) return
    const ids = accounts.map(a => a.id)

    // Ambil semua transaksi yang melibatkan akun-akun ini (sebagai sumber ATAU tujuan)
    const { data: asSumber } = await supabase
      .from('transactions')
      .select('account_id, account_to_id, type, amount')
      .in('account_id', ids)

    const { data: asTujuan } = await supabase
      .from('transactions')
      .select('account_id, account_to_id, type, amount')
      .in('account_to_id', ids)

    const changes = {}
    ids.forEach(id => { changes[id] = 0 })

    // Transaksi di mana akun adalah account_id (sumber/pemilik utama)
    ;(asSumber || []).forEach(tx => {
      if (tx.type === 'income') {
        changes[tx.account_id] = (changes[tx.account_id] || 0) + tx.amount
      } else if (tx.type === 'expense') {
        changes[tx.account_id] = (changes[tx.account_id] || 0) - tx.amount
      } else if (tx.type === 'transfer') {
        // account_id = sumber transfer → saldo berkurang
        changes[tx.account_id] = (changes[tx.account_id] || 0) - tx.amount
      }
    })

    // Transaksi transfer di mana akun adalah account_to_id (tujuan transfer) → saldo bertambah
    ;(asTujuan || []).forEach(tx => {
      if (tx.type === 'transfer' && tx.account_to_id && ids.includes(tx.account_to_id)) {
        changes[tx.account_to_id] = (changes[tx.account_to_id] || 0) + tx.amount
      }
    })

    setNetChanges(changes)
  }

  const checkTxCount = async (accountId) => {
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('account_id', accountId)
    return count || 0
  }

  // --- Tambah Akun ---
  const handleSave = async () => {
    if (!form.name) { setError('Nama dompet wajib diisi'); return }
    setSaving(true); setError('')
    const { data: inserted, error: err } = await supabase.from('accounts').insert({
      user_id: userId, name: form.name, type: form.type,
      balance: parseFloat(form.balance) || 0, color: form.color, notes: form.notes,
    }).select().single()
    if (err) { setError(err.message) }
    else {
      await logActivity(userId, 'akun', inserted.id, 'create', null, { name: form.name, type: form.type, balance: parseFloat(form.balance) || 0 })
      setShowModal(false)
      setForm({ name: '', type: 'Rekening Bank', balance: '', color: '#5B5F97', notes: '' })
      fetchAkun()
    }
    setSaving(false)
  }

  // --- Edit Akun ---
  const openEdit = (akun) => {
    setEditForm({ id: akun.id, name: akun.name, type: akun.type, balance: akun.balance, color: akun.color, notes: akun.notes || '' })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!editForm.name) { setEditError('Nama dompet wajib diisi'); return }
    setEditSaving(true); setEditError('')
    const old = akuns.find(a => a.id === editForm.id)
    const { error: err } = await supabase.from('accounts').update({
      name: editForm.name, type: editForm.type,
      balance: parseFloat(editForm.balance) || 0, color: editForm.color, notes: editForm.notes,
    }).eq('id', editForm.id)
    if (err) { setEditError(err.message) }
    else {
      await logActivity(userId, 'akun', editForm.id, 'update',
        { name: old.name, type: old.type, balance: old.balance, color: old.color },
        { name: editForm.name, type: editForm.type, balance: parseFloat(editForm.balance) || 0, color: editForm.color }
      )
      setShowEditModal(false)
      fetchAkun()
    }
    setEditSaving(false)
  }

  // --- Hapus ---
  const handleDelete = async (akun) => {
    const count = await checkTxCount(akun.id)
    if (count > 0) { alert(`Tidak bisa dihapus — akun ini masih digunakan di ${count} transaksi.`); return }
    if (!confirm('Hapus akun ini?')) return
    await logActivity(userId, 'akun', akun.id, 'delete', { name: akun.name, type: akun.type, balance: akun.balance }, null)
    await supabase.from('accounts').delete().eq('id', akun.id)
    fetchAkun()
  }

  // --- Top-up / Transfer Saldo ---
  const openTopup = (akun) => {
    setTopupTarget(akun)
    setTopupForm({ jumlah: '', sumber: '', catatan: '', tanggal: getLocalDate() })
    setTopupError('')
    setShowTopupModal(true)
  }

  // handleTopup — khusus transfer antar dompet
  const handleTopup = async () => {
    if (!topupForm.jumlah || isNaN(topupForm.jumlah) || parseFloat(topupForm.jumlah) <= 0) {
      setTopupError('Jumlah harus diisi dan lebih dari 0'); return
    }
    if (!topupForm.sumber) {
      setTopupError('Pilih dompet asal terlebih dahulu'); return
    }
    setTopupSaving(true); setTopupError('')

    const jumlah = parseFloat(topupForm.jumlah)

    // Format tanggal ISO dengan offset WITA +08:00
    const [yy, mo, dd] = topupForm.tanggal.split('-').map(Number)
    const pad = n => String(n).padStart(2, '0')
    const isoDate = `${yy}-${pad(mo)}-${pad(dd)}T12:00:00+08:00`

    {
      // Transfer antar dompet
      // Cari dompet sumber
      const sumberAkun = akuns.find(a => a.id === topupForm.sumber)
      if (!sumberAkun) { setTopupError('Dompet sumber tidak ditemukan'); setTopupSaving(false); return }

      // Cek saldo sumber cukup
      if ((sumberAkun.balance || 0) < jumlah) {
        setTopupError(`Saldo ${sumberAkun.name} tidak cukup (${fmt(sumberAkun.balance)})`);
        setTopupSaving(false); return
      }

      // 1) Kurangi saldo dompet SUMBER
      const { error: errSumber } = await supabase
        .from('accounts')
        .update({ balance: (sumberAkun.balance || 0) - jumlah })
        .eq('id', topupForm.sumber)
      if (errSumber) { setTopupError(errSumber.message); setTopupSaving(false); return }

      // 2) Tambah saldo dompet TUJUAN
      const { error: errTujuan } = await supabase
        .from('accounts')
        .update({ balance: (topupTarget.balance || 0) + jumlah })
        .eq('id', topupTarget.id)
      if (errTujuan) { setTopupError(errTujuan.message); setTopupSaving(false); return }

      // 3) Catat 1 transaksi tipe 'transfer'
      //    account_id   = sumber (yang berkurang)
      //    account_to_id = tujuan (yang bertambah)
      const { error: errTx } = await supabase.from('transactions').insert({
        user_id: userId,
        account_id: topupForm.sumber,          // sumber
        account_to_id: topupTarget.id,         // tujuan
        type: 'transfer',
        amount: jumlah,
        category_id: null,
        description: topupForm.catatan || `Transfer ke ${topupTarget.name}`,
        date: isoDate,
      })
      if (errTx) { setTopupError(errTx.message); setTopupSaving(false); return }

      await logActivity(userId, 'akun', topupTarget.id, 'transfer',
        { from: sumberAkun.name, balance_sumber: sumberAkun.balance },
        { to: topupTarget.name, balance_tujuan: topupTarget.balance, jumlah }
      )

    }

    setShowTopupModal(false)
    fetchAkun()
    setTopupSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--bg-card)',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const totalSaldo = akuns.reduce((sum, a) => sum + (a.balance || 0), 0)

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Akun Dompet</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Total saldo: <strong style={{ color: 'var(--text)' }}>{fmt(totalSaldo)}</strong>
        </p>
      </div>

      {/* List dompet */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {akuns.map(akun => {
            const net = netChanges[akun.id] ?? 0
            const isPositive = net >= 0
            const initialBal = akun.initial_balance ?? (akun.balance - net)
            return (
              <div key={akun.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {/* Row 1: icon + name/type + notes pill + edit + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: akun.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {getIcon(akun.type, akun.color)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{akun.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{akun.type}</div>
                  </div>
                  {akun.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '5px', padding: '3px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', flexShrink: 1 }}>{akun.notes}</div>
                  )}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(akun)} title="Edit" style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(akun)} title="Hapus" style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--danger)', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Row 2: saldo + tombol tambah saldo */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: '1.1' }}>{fmt(akun.balance)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Saldo saat ini</div>
                  </div>
                  <button
                    onClick={() => openTopup(akun)}
                    style={{
                      padding: '7px 13px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Tambah Saldo
                  </button>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border)' }} />

                {/* Row 3: Awal & Perubahan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Awal</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{fmt(initialBal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Perubahan</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: isPositive ? '#22C55E' : '#FF6B6C', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {isPositive ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF6B6C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                      )}
                      {isPositive ? '+' : ''}{fmt(net)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Tombol Buat Dompet Baru */}
          <button
            onClick={() => { setForm({ name: '', type: 'Rekening Bank', balance: '', color: '#5B5F97', notes: '' }); setError(''); setShowModal(true) }}
            style={{
              width: '100%',
              padding: '13px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1.5px dashed var(--border)',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              marginTop: '2px',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Dompet Baru
          </button>
        </div>
      )}

      {/* ===== Modal Tambah Akun ===== */}
      {showModal && (
        <ModalWrapper onClose={() => setShowModal(false)}>
          <ModalHeader title="Tambah Dompet" onClose={() => setShowModal(false)} />
          {error && <ErrorBox msg={error} />}
          <Field label="Nama *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="mis. BCA Utama, GoPay, Kas" style={inputStyle} />
          </Field>
          <Field label="Tipe Dompet">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {TIPE_AKUN.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Saldo Awal (Rp)">
            <input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="0" style={inputStyle} />
          </Field>
          <Field label="Warna">
            <ColorPicker value={form.color} onChange={c => setForm({ ...form, color: c })} />
          </Field>
          <Field label="Catatan (opsional)">
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="mis. Untuk kebutuhan sehari-hari" style={inputStyle} />
          </Field>
          <ModalFooter onCancel={() => setShowModal(false)} onSave={handleSave} saving={saving} saveLabel="Simpan Akun" />
        </ModalWrapper>
      )}

      {/* ===== Modal Edit Akun ===== */}
      {showEditModal && editForm && (
        <ModalWrapper onClose={() => setShowEditModal(false)}>
          <ModalHeader title="Edit Dompet" onClose={() => setShowEditModal(false)} />
          {editError && <ErrorBox msg={editError} />}
          <Field label="Nama *">
            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Tipe Dompet">
            <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} style={inputStyle}>
              {TIPE_AKUN.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Saldo (Rp)">
            <input type="number" value={editForm.balance} onChange={e => setEditForm({ ...editForm, balance: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Warna">
            <ColorPicker value={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
          </Field>
          <Field label="Catatan (opsional)">
            <input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={inputStyle} />
          </Field>
          <ModalFooter onCancel={() => setShowEditModal(false)} onSave={handleEdit} saving={editSaving} saveLabel="Simpan Perubahan" />
        </ModalWrapper>
      )}

      {/* ===== Modal Top-up / Transfer Saldo ===== */}
      {showTopupModal && topupTarget && (
        <ModalWrapper onClose={() => setShowTopupModal(false)}>
          <ModalHeader title={`Tambah Saldo — ${topupTarget.name}`} onClose={() => setShowTopupModal(false)} />
          {topupError && <ErrorBox msg={topupError} />}
          <Field label="Jumlah (Rp) *">
            <input type="number" value={topupForm.jumlah} onChange={e => setTopupForm({ ...topupForm, jumlah: e.target.value })} placeholder="0" style={inputStyle} />
          </Field>

          <Field label="Dompet Asal *">
            <select value={topupForm.sumber} onChange={e => setTopupForm({ ...topupForm, sumber: e.target.value })} style={inputStyle}>
              <option value="">Pilih dompet asal</option>
              {akuns.filter(a => a.id !== topupTarget.id).map(a => (
                <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
              ))}
            </select>
            {topupForm.sumber && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                Saldo {akuns.find(a => a.id === topupForm.sumber)?.name} akan berkurang
              </div>
            )}
          </Field>

          <Field label="Catatan (opsional)">
            <input value={topupForm.catatan} onChange={e => setTopupForm({ ...topupForm, catatan: e.target.value })} placeholder={`Transfer ke ${topupTarget.name}`} style={inputStyle} />
          </Field>
          <Field label="Tanggal">
            <input type="date" value={topupForm.tanggal} onChange={e => setTopupForm({ ...topupForm, tanggal: e.target.value })} style={inputStyle} />
          </Field>
          <ModalFooter
            onCancel={() => setShowTopupModal(false)}
            onSave={handleTopup}
            saving={topupSaving}
            saveLabel="Transfer Sekarang"
          />
        </ModalWrapper>
      )}
    </div>
  )
}

// ---- Shared sub-components ----

function ModalWrapper({ children, onClose }) {
  return (
    <>
      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '16px',
          animation: 'modalBackdropIn 0.2s ease both',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            width: '440px', maxWidth: '100%',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto',
            animation: 'modalSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
      <button onClick={onCancel} style={{ flex: 1, padding: '13px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
      <button onClick={onSave} disabled={saving} style={{ flex: 2, padding: '13px', background: saving ? '#ccc' : '#F97316', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
        {saving ? 'Menyimpan...' : saveLabel}
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function ErrorBox({ msg }) {
  return <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{msg}</div>
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {WARNA.map(w => (
        <div key={w} onClick={() => onChange(w)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: w, cursor: 'pointer', border: value === w ? '3px solid var(--text)' : '3px solid transparent' }} />
      ))}
    </div>
  )
}