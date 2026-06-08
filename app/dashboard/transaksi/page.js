'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Trash2, Clock, Wallet, ArrowLeftRight, Tag, X } from 'lucide-react'

const PAGE_SIZE = 20

// ── Modal Tambah/Edit Transaksi ──────────────────────────────────────────────
function TransaksiModal({ isOpen, onClose, onSaved, editData, accounts, categories }) {
  const now = new Date()
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

  const emptyForm = {
    amount: '',
    account_id: '',
    category_id: '',
    description: '',
    date: todayStr,
    type: 'expense',
  }

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true))
      if (editData) {
        setForm({
          amount: editData.amount ?? '',
          account_id: editData.account_id ?? '',
          category_id: editData.category_id ?? '',
          description: editData.description ?? '',
          date: editData.date ?? todayStr,
          type: editData.type ?? 'expense',
        })
      } else {
        setForm(emptyForm)
      }
    }
  }, [isOpen, editData])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleSave = async () => {
    if (!form.amount || !form.account_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user.id,
      amount: Number(form.amount),
      account_id: form.account_id,
      category_id: form.category_id || null,
      description: form.description,
      date: form.date,
      type: form.type,
    }
    if (editData?.id) {
      await supabase.from('transactions').update(payload).eq('id', editData.id)
    } else {
      await supabase.from('transactions').insert(payload)
    }
    setSaving(false)
    close()
    onSaved()
  }

  if (!isOpen) return null

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1px solid var(--border)', borderRadius: '10px',
    fontSize: '14px', background: 'var(--bg-card)', color: 'var(--text)',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    WebkitAppearance: 'none',
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: visible ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        transition: 'background 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          width: '100%', maxWidth: '440px',
          maxHeight: '90vh', overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
          transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>✏️</span>
            <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>
              {editData ? 'Edit Transaksi' : 'Catat Transaksi'}
            </span>
          </div>
          <button onClick={close} style={{
            background: 'var(--bg)', border: 'none', borderRadius: '50%',
            width: '30px', height: '30px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Jumlah */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Jumlah (Rp) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Akun */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Dokumen / Metode <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.account_id}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
              style={{ ...inputStyle, paddingRight: '36px' }}
            >
              <option value="">Pilih akun</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
          </div>
        </div>

        {/* Kategori */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Kategori
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              style={{ ...inputStyle, paddingRight: '36px' }}
            >
              <option value="">Tanpa kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
          </div>
        </div>

        {/* Keterangan */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Keterangan
          </label>
          <textarea
            placeholder="mis. Makan siang, Gaji April..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tanggal */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Tombol */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={close} style={{
            flex: 1, padding: '13px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.amount || !form.account_id}
            style={{
              flex: 2, padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: saving || !form.amount || !form.account_id ? '#ccc' : '#F97316',
              color: 'white',
              fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TransaksiPage() {
  const [transaksi, setTransaksi] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [totalBulanIni, setTotalBulanIni] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  const [filterWaktu, setFilterWaktu] = useState(null)
  const [filterDompet, setFilterDompet] = useState(null)
  const [filterTipe, setFilterTipe] = useState(null)
  const [filterKategori, setFilterKategori] = useState(null)

  const [openPicker, setOpenPicker] = useState(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])

  const [tempDompet, setTempDompet] = useState(null)
  const [tempTipe, setTempTipe] = useState(null)
  const [tempKategori, setTempKategori] = useState(null)

  const now = new Date()
  const [tempWaktu, setTempWaktu] = useState({
    bulan: now.getMonth() + 1,
    tahun: now.getFullYear(),
  })

  const searchRef = useRef(null)
  const sentinelRef = useRef(null)
  const fetchingRef = useRef(false)
  const bulanDrumRef = useRef(null)
  const tahunDrumRef = useRef(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')

  const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const tahunList = Array.from({ length: 11 }, (_, i) => 2020 + i)

  useEffect(() => {
    if (openPicker) requestAnimationFrame(() => setPickerVisible(true))
  }, [openPicker])

  const closePicker = (callback) => {
    setPickerVisible(false)
    setTimeout(() => {
      setOpenPicker(null)
      if (callback) callback()
    }, 300)
  }

  useEffect(() => {
    if (openPicker === 'dompet') setTempDompet(filterDompet)
    if (openPicker === 'tipe') setTempTipe(filterTipe)
    if (openPicker === 'kategori') setTempKategori(filterKategori)
  }, [openPicker])

  useEffect(() => {
    if (openPicker === 'waktu') {
      const b = (filterWaktu?.bulan ?? now.getMonth() + 1) - 1
      const t = tahunList.indexOf(filterWaktu?.tahun ?? now.getFullYear())
      setTempWaktu({
        bulan: filterWaktu?.bulan ?? now.getMonth() + 1,
        tahun: filterWaktu?.tahun ?? now.getFullYear(),
      })
      setTimeout(() => {
        bulanDrumRef.current?.scrollTo({ top: b * 44 })
        tahunDrumRef.current?.scrollTo({ top: Math.max(0, t) * 44 })
      }, 50)
    }
  }, [openPicker])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchMeta() }, [])

  useEffect(() => {
    resetAndFetch()
    fetchTotalBulanIni()
  }, [filterWaktu, filterDompet, filterTipe, filterKategori])

  useEffect(() => {
    const handler = () => { resetAndFetch(); fetchTotalBulanIni() }
    window.addEventListener('refetch-transaksi', handler)
    return () => window.removeEventListener('refetch-transaksi', handler)
  }, [filterWaktu, filterDompet, filterTipe, filterKategori])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading)
          setPage(prev => { fetchPage(prev + 1); return prev })
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading])

  const drumColStyle = {
    flex: 1, height: '220px', overflowY: 'scroll',
    scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
    msOverflowStyle: 'none', padding: '88px 0', position: 'relative', zIndex: 2,
  }

  const drumItemStyle = (active) => ({
    height: '44px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', scrollSnapAlign: 'center',
    fontSize: active ? '28px' : '18px',
    fontWeight: active ? '500' : '400',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    opacity: active ? 1 : 0.4,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const fetchMeta = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: acc }, { data: cat }] = await Promise.all([
      supabase.from('accounts').select('id, name').eq('user_id', user.id),
      supabase.from('categories').select('id, name, icon').eq('user_id', user.id),
    ])
    setAccounts(acc || [])
    setCategories(cat || [])
  }

  const fetchTotalBulanIni = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const targetBulan = filterWaktu?.bulan ?? (now.getMonth() + 1)
    const targetTahun = filterWaktu?.tahun ?? now.getFullYear()
    const pad = String(targetBulan).padStart(2, '0')
    const lastDay = new Date(targetTahun, targetBulan, 0).getDate()
    let q = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', `${targetTahun}-${pad}-01`)
      .lte('date', `${targetTahun}-${pad}-${lastDay}`)
    if (filterDompet) q = q.eq('account_id', filterDompet)
    if (filterTipe) q = q.eq('type', filterTipe)
    if (filterKategori) q = q.eq('category_id', filterKategori)
    const { count } = await q
    setTotalBulanIni(count || 0)
  }

  const resetAndFetch = () => {
    setTransaksi([])
    setPage(0)
    setHasMore(true)
    fetchingRef.current = false
    fetchPage(0, true)
  }

  const buildQuery = async (base) => {
    const { data: { user } } = await supabase.auth.getUser()
    let q = base.eq('user_id', user.id)
    if (filterWaktu) {
      const { bulan, tahun } = filterWaktu
      const pad = String(bulan).padStart(2, '0')
      const lastDay = new Date(tahun, bulan, 0).getDate()
      q = q.gte('date', `${tahun}-${pad}-01`).lte('date', `${tahun}-${pad}-${lastDay}`)
    }
    if (filterDompet) q = q.eq('account_id', filterDompet)
    if (filterTipe) q = q.eq('type', filterTipe)
    if (filterKategori) q = q.eq('category_id', filterKategori)
    return q
  }

  const fetchPage = async (pageNum, isReset = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    if (isReset) setLoading(true)
    else setLoadingMore(true)
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const base = supabase
      .from('transactions')
      .select(`*, accounts!transactions_account_id_fkey(name), account_to:accounts!transactions_account_to_id_fkey(name), categories(name, icon, color)`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
    const q = await buildQuery(base)
    const { data } = await q
    const rows = data || []
    if (isReset) setTransaksi(rows)
    else setTransaksi(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setPage(pageNum)
    if (isReset) setLoading(false)
    else setLoadingMore(false)
    fetchingRef.current = false
  }

  // ✅ FIX: Hapus transfer → kembalikan saldo kedua dompet
  const handleDelete = async (tx) => {
    if (!confirm('Hapus transaksi ini?')) return

    if (tx.type === 'transfer' && tx.account_id && tx.account_to_id) {
      // Ambil saldo terkini kedua akun
      const { data: akuns } = await supabase
        .from('accounts')
        .select('id, balance')
        .in('id', [tx.account_id, tx.account_to_id])

      if (akuns && akuns.length === 2) {
        const sumber = akuns.find(a => a.id === tx.account_id)
        const tujuan = akuns.find(a => a.id === tx.account_to_id)

        // Kembalikan: sumber +amount, tujuan -amount
        await Promise.all([
          supabase.from('accounts').update({ balance: (sumber.balance || 0) + tx.amount }).eq('id', sumber.id),
          supabase.from('accounts').update({ balance: (tujuan.balance || 0) - tx.amount }).eq('id', tujuan.id),
        ])
      }
    }

    await supabase.from('transactions').delete().eq('id', tx.id)
    resetAndFetch()
    fetchTotalBulanIni()
  }

  const openAddModal = () => { setEditData(null); setModalOpen(true) }
  const openEditModal = (tx) => { setEditData(tx); setModalOpen(true) }
  const handleSaved = () => { resetAndFetch(); fetchTotalBulanIni() }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const fmtJam = (createdAt) => {
    if (!createdAt) return ''
    return new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const isSearching = searchQuery.trim().length > 0
  const filteredList = isSearching
    ? transaksi.filter(tx =>
        (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.accounts?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.account_to?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transaksi

  const groupByDate = (list) => {
    const groups = {}
    list.forEach(tx => {
      // Ambil tanggal dari field date (string YYYY-MM-DD atau ISO)
      const dateKey = (tx.date || '').substring(0, 10)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(tx)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const formatGroupLabel = (dateStr) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((today - d) / 86400000)
    if (diff === 0) return 'Hari ini'
    if (diff === 1) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getAmountColor = (tx) => tx.type === 'transfer' ? 'var(--text-muted)' : tx.type === 'income' ? '#16a34a' : 'var(--danger)'
  const getAmountPrefix = (tx) => tx.type === 'transfer' ? '↔ ' : tx.type === 'income' ? '+' : '−'

  const getDescription = (tx) => tx.description || '(Tanpa keterangan)'
  const getSubtitle = (tx) => tx.type === 'transfer'
    ? `${tx.accounts?.name} → ${tx.account_to?.name || '?'}`
    : `${tx.accounts?.name} · ${tx.categories?.name || '-'}`
  const getIcon = (tx) => tx.type === 'transfer' ? '🔄' : (tx.categories?.icon || '💸')
  const getIconBg = (tx) => tx.type === 'transfer' ? '#5B5F9722' : ((tx.categories?.color || '#5B5F97') + '22')

  const pillWaktu = filterWaktu ? `${bulanList[filterWaktu.bulan - 1]} ${filterWaktu.tahun}` : 'Semua waktu'
  const pillDompet = filterDompet ? (accounts.find(a => a.id === filterDompet)?.name || 'Dompet') : 'Semua dompet'
  const pillTipe = filterTipe ? ({ income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' }[filterTipe]) : 'Semua tipe'
  const pillKategori = filterKategori ? (categories.find(c => c.id === filterKategori)?.name || 'Kategori') : 'Semua kategori'
  const labelBulanCounter = filterWaktu
    ? `${bulanList[filterWaktu.bulan - 1]} ${filterWaktu.tahun}`
    : `${bulanList[now.getMonth()]} ${now.getFullYear()}`

  const grouped = groupByDate(filteredList)

  const pillStyle = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '6px 11px',
    background: active ? 'var(--primary-light)' : 'transparent',
    border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'),
    borderRadius: '99px', fontSize: '12px',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  })

  const pillIcons = {
    waktu: <Clock size={12} />,
    dompet: <Wallet size={12} />,
    tipe: <ArrowLeftRight size={12} />,
    kategori: <Tag size={12} />,
  }

  return (
    <div>
      {/* Modal Tambah/Edit */}
      <TransaksiModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        editData={editData}
        accounts={accounts}
        categories={categories}
      />

      {/* Picker modal filter */}
      {openPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: pickerVisible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          transition: 'background 0.3s ease',
        }} onClick={() => closePicker()}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: '480px', padding: '20px 20px 32px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            transform: pickerVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 16px', flexShrink: 0 }} />

            {openPicker === 'waktu' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
                  <button onClick={() => closePicker()} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>Batal</button>
                  <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)' }}>Pilih periode</span>
                  <button onClick={() => closePicker(() => setFilterWaktu(tempWaktu))} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Selesai</button>
                </div>
                <div style={{ display: 'flex', padding: '0 20px', marginBottom: '-8px' }}>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bulan</div>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tahun</div>
                </div>
                <div style={{ display: 'flex', position: 'relative', padding: '0 20px' }}>
                  <div style={{ position: 'absolute', left: '20px', right: '20px', top: '50%', transform: 'translateY(-50%)', height: '44px', background: 'var(--primary-light)', borderRadius: '10px', pointerEvents: 'none', zIndex: 1 }} />
                  <div ref={bulanDrumRef} style={drumColStyle} onScroll={() => {
                    const idx = Math.round(bulanDrumRef.current.scrollTop / 44)
                    setTempWaktu(prev => ({ ...prev, bulan: Math.max(1, Math.min(idx + 1, 12)) }))
                  }}>
                    {bulanList.map((b, i) => (
                      <div key={i} style={drumItemStyle(tempWaktu.bulan === i + 1)}
                        onClick={() => bulanDrumRef.current.scrollTo({ top: i * 44, behavior: 'smooth' })}>{b}</div>
                    ))}
                  </div>
                  <div ref={tahunDrumRef} style={drumColStyle} onScroll={() => {
                    const idx = Math.round(tahunDrumRef.current.scrollTop / 44)
                    setTempWaktu(prev => ({ ...prev, tahun: tahunList[Math.max(0, Math.min(idx, tahunList.length - 1))] }))
                  }}>
                    {tahunList.map((y, i) => (
                      <div key={y} style={drumItemStyle(tempWaktu.tahun === y)}
                        onClick={() => tahunDrumRef.current.scrollTo({ top: i * 44, behavior: 'smooth' })}>{y}</div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {openPicker === 'dompet' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px', color: 'var(--text)' }}>Dompet</div>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                  {[{ id: null, name: 'Semua dompet' }, ...accounts].map((a, i, arr) => (
                    <div key={a.id || 'all'} onClick={() => setTempDompet(a.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text)' }}>{a.name}</span>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, border: tempDompet === a.id ? '2px solid var(--primary)' : '2px solid var(--border)', background: tempDompet === a.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {tempDompet === a.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => closePicker(() => setFilterDompet(null))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: '1px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}>Hapus filter</button>
                  <button onClick={() => closePicker(() => setFilterDompet(tempDompet))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: 'none', background: 'var(--primary)', fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer' }}>Pasang</button>
                </div>
              </div>
            )}

            {openPicker === 'tipe' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px', color: 'var(--text)' }}>Jenis transaksi</div>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                  {[{ value: null, label: 'Semua tipe' }, { value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'transfer', label: 'Transfer' }].map((t, i, arr) => (
                    <div key={t.value || 'all'} onClick={() => setTempTipe(t.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text)' }}>{t.label}</span>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, border: tempTipe === t.value ? '2px solid var(--primary)' : '2px solid var(--border)', background: tempTipe === t.value ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {tempTipe === t.value && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => closePicker(() => setFilterTipe(null))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: '1px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}>Hapus filter</button>
                  <button onClick={() => closePicker(() => setFilterTipe(tempTipe))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: 'none', background: 'var(--primary)', fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer' }}>Pasang</button>
                </div>
              </div>
            )}

            {openPicker === 'kategori' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px', color: 'var(--text)' }}>Kategori</div>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                  {[{ id: null, name: 'Semua kategori', icon: '' }, ...categories].map((c, i, arr) => (
                    <div key={c.id || 'all'} onClick={() => setTempKategori(c.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text)' }}>{c.icon ? `${c.icon} ${c.name}` : c.name}</span>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, border: tempKategori === c.id ? '2px solid var(--primary)' : '2px solid var(--border)', background: tempKategori === c.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {tempKategori === c.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => closePicker(() => setFilterKategori(null))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: '1px solid var(--border)', background: 'transparent', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}>Hapus filter</button>
                  <button onClick={() => closePicker(() => setFilterKategori(tempKategori))} style={{ flex: 1, padding: '14px', borderRadius: '99px', border: 'none', background: 'var(--primary)', fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer' }}>Pasang</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Transaksi</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            {totalBulanIni} transaksi di {labelBulanCounter}
          </p>
        </div>
        <button onClick={openAddModal} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '9px 14px', background: 'var(--primary)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          flexShrink: 0,
        }}>+ Transaksi Baru</button>
      </div>

      {/* Search + Filter Pills */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi, kategori, akun..."
            style={{ width: '100%', padding: '11px 14px 11px 36px', border: 'none', borderRadius: '0', fontSize: '14px', background: 'transparent', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 10px', scrollbarWidth: 'none' }}>
          {[
            { key: 'waktu', label: pillWaktu, active: !!filterWaktu },
            { key: 'dompet', label: pillDompet, active: !!filterDompet },
            { key: 'tipe', label: pillTipe, active: !!filterTipe },
            { key: 'kategori', label: pillKategori, active: !!filterKategori },
          ].map(p => (
            <button key={p.key} onClick={() => setOpenPicker(p.key)} style={pillStyle(p.active)}>
              {pillIcons[p.key]}
              <span style={{ fontSize: '12px' }}>{p.label}</span>
              <span style={{ fontSize: '10px' }}>▾</span>
            </button>
          ))}
        </div>
      </div>

      {/* List transaksi */}
      <div>
        {isSearching && (
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px' }}>
            Hasil "{searchQuery}"
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isSearching ? '🔍' : '💸'}</div>
            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>{isSearching ? 'Tidak ditemukan' : 'Belum ada transaksi'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{isSearching ? 'Coba kata kunci lain' : 'Tambah transaksi pertama Anda'}</div>
          </div>
        ) : (
          <>
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {formatGroupLabel(dateKey)}
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {items.map((tx, i) => (
                    <div key={tx.id}
                      onClick={() => !isMobile && router.push(detailId === String(tx.id) ? '?' : `?detail=${tx.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 13px',
                        borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                        background: detailId === String(tx.id) ? 'var(--pilih)' : 'transparent',
                        cursor: 'pointer', gap: '8px',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: getIconBg(tx), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{getIcon(tx)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getDescription(tx)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getSubtitle(tx)}</span>
                            {fmtJam(tx.created_at) && (<><span style={{ flexShrink: 0 }}>·</span><span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtJam(tx.created_at)}</span></>)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: getAmountColor(tx) }}>
                          {getAmountPrefix(tx)}{fmt(tx.amount)}
                        </div>
                        <button className="action-btn-mobile"
                          onClick={(e) => { e.stopPropagation(); openEditModal(tx) }}
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}>
                          <Pencil size={13} />
                        </button>
                        <button className="action-btn-mobile"
                          onClick={(e) => { e.stopPropagation(); handleDelete(tx) }}
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!isSearching && <div ref={sentinelRef} style={{ height: '1px', marginTop: '8px' }} />}
            {loadingMore && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>Memuat lebih banyak...</div>}
            {!hasMore && !isSearching && transaksi.length > 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>Semua transaksi sudah ditampilkan</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}