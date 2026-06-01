export const dynamic = 'force-dynamic'
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'



const bulanList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const tahunList = Array.from({ length: 2030 - 2020 + 1 }, (_, i) => 2020 + i)

const cardConfigs = [
  { label: 'Semua',       gradient: 'linear-gradient(135deg, #5B5F97 0%, #7B7FC4 100%)', color: '#5B5F97' },
  { label: 'Pemasukan',   gradient: 'linear-gradient(135deg, #16a34a 0%, #22C55E 100%)', color: '#16a34a' },
  { label: 'Pengeluaran', gradient: 'linear-gradient(135deg, #dc2626 0%, #FF6B6C 100%)', color: '#dc2626' },
]

function MonthYearPicker({ bulan, tahun, onChange, onClose }) {
  const [tempBulan, setTempBulan] = useState(bulan)
  const [tempTahun, setTempTahun] = useState(tahun)
  const bulanRef = useRef(null)
  const tahunRef = useRef(null)

  useEffect(() => {
    if (bulanRef.current) bulanRef.current.scrollTop = (tempBulan - 1) * 44
    if (tahunRef.current) tahunRef.current.scrollTop = tahunList.indexOf(tempTahun) * 44
  }, [])

  const handleBulanScroll = () => {
    const idx = Math.round(bulanRef.current.scrollTop / 44)
    setTempBulan(Math.min(Math.max(idx + 1, 1), 12))
  }

  const handleTahunScroll = () => {
    const idx = Math.round(tahunRef.current.scrollTop / 44)
    setTempTahun(tahunList[Math.min(Math.max(idx, 0), tahunList.length - 1)])
  }

  const colStyle = {
    flex: 1, height: '220px', overflowY: 'scroll',
    scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
    msOverflowStyle: 'none', position: 'relative', padding: '88px 0',
  }

  const itemStyle = (active) => ({
    height: '44px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', scrollSnapAlign: 'center',
    fontSize: active ? '17px' : '14px', fontWeight: active ? '600' : '400',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    cursor: 'pointer', transition: 'all 0.1s', position: 'relative', zIndex: 2,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px',
        width: '100%', maxWidth: '360px', padding: '0 0 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '15px', color: 'var(--text-muted)', cursor: 'pointer' }}>Batal</button>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>Pilih Periode</div>
          <button onClick={() => { onChange(tempBulan, tempTahun); onClose() }} style={{ background: 'none', border: 'none', fontSize: '15px', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Selesai</button>
        </div>
        <div style={{ display: 'flex', position: 'relative', padding: '0 20px' }}>
          <div style={{
            position: 'absolute', left: '20px', right: '20px',
            top: '50%', transform: 'translateY(-50%)',
            height: '44px', background: 'var(--primary-light)',
            borderRadius: '10px', pointerEvents: 'none', zIndex: 1,
          }} />
          <div ref={bulanRef} style={colStyle} onScroll={handleBulanScroll}>
            {bulanList.map((b, i) => (
              <div key={i} style={itemStyle(tempBulan === i + 1)}
                onClick={() => { setTempBulan(i + 1); bulanRef.current.scrollTo({ top: i * 44, behavior: 'smooth' }) }}
              >{b}</div>
            ))}
          </div>
          <div ref={tahunRef} style={colStyle} onScroll={handleTahunScroll}>
            {tahunList.map((y, i) => (
              <div key={y} style={itemStyle(tempTahun === y)}
                onClick={() => { setTempTahun(y); tahunRef.current.scrollTo({ top: i * 44, behavior: 'smooth' }) }}
              >{y}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TransaksiPage() {
  const [transaksi, setTransaksi] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [activeCard, setActiveCard] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  useEffect(() => {
    window.addEventListener('refetch-transaksi', fetchData)
    return () => window.removeEventListener('refetch-transaksi', fetchData)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const bulanStr = String(filterBulan).padStart(2, '0')
    const lastDay = new Date(filterTahun, filterBulan, 0).getDate()
    const { data: t } = await supabase.from('transactions')
      .select('*, accounts(name), categories(name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', `${filterTahun}-${bulanStr}-01`)
      .lte('date', `${filterTahun}-${bulanStr}-${lastDay}`)
      .order('created_at', { ascending: false })
    setTransaksi(t || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    await supabase.from('transactions').delete().eq('id', id)
    fetchData()
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const income  = transaksi.filter(t => t.type === 'income')
  const expense = transaksi.filter(t => t.type === 'expense')
  const totalMasuk  = income.reduce((s, t) => s + t.amount, 0)
  const totalKeluar = expense.reduce((s, t) => s + t.amount, 0)
  const selisih = totalMasuk - totalKeluar

  const topKatCount = (list) => {
    const map = {}
    list.forEach(t => {
      const key = t.category_id
      if (!map[key]) map[key] = { name: t.categories?.name, icon: t.categories?.icon, count: 0 }
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.count - a.count)[0]
  }

  const topAllCount     = topKatCount(transaksi)
  const topIncomeCount  = topKatCount(income)
  const topExpenseCount = topKatCount(expense)

  const rowWhite = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }

  const cardContent = [
    <>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '2px' }}>Sisa Saldo</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '10px', letterSpacing: '-0.5px' }}>
        {fmt(selisih)}
      </div>
      <div style={{ ...rowWhite, marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Pemasukan − Pengeluaran</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
          {fmt(totalMasuk)} − {fmt(totalKeluar)}
        </div>
      </div>
    </>,
    <>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '2px' }}>Total Pemasukan</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '10px', letterSpacing: '-0.5px' }}>
        {fmt(totalMasuk)}
      </div>
      <div style={{ ...rowWhite, marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Transaksi Terbanyak</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
          {topIncomeCount ? `${topIncomeCount.icon || ''} ${topIncomeCount.name}` : '—'}
        </div>
      </div>
    </>,
    <>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '2px' }}>Total Pengeluaran</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '10px', letterSpacing: '-0.5px' }}>
        {fmt(totalKeluar)}
      </div>
      <div style={{ ...rowWhite, marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Transaksi Terbanyak</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
          {topExpenseCount ? `${topExpenseCount.icon || ''} ${topExpenseCount.name}` : '—'}
        </div>
      </div>
    </>,
  ]

  const baseList = activeCard === 0 ? transaksi : activeCard === 1 ? income : expense
  const isSearching = searchQuery.trim().length > 0
  const searchList = isSearching
    ? transaksi.filter(tx =>
        (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.accounts?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : baseList

  const handleSearchToggle = () => {
    if (searchOpen) { setSearchQuery(''); setSearchOpen(false) }
    else { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 100) }
  }

  return (
    <div>
      {showPicker && (
        <MonthYearPicker
          bulan={filterBulan} tahun={filterTahun}
          onChange={(b, y) => { setFilterBulan(b); setFilterTahun(y) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Transaksi Bulanan</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Kelola semua transaksi kamu</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button onClick={handleSearchToggle} style={{
              padding: '9px 12px',
              background: searchOpen ? 'var(--primary-light)' : 'var(--bg-card)',
              border: '1px solid ' + (searchOpen ? 'var(--primary)' : 'var(--border)'),
              borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', color: searchOpen ? 'var(--primary)' : 'var(--text-muted)',
            }}>🔍</button>
            <button onClick={() => router.push('/dashboard/transaksi/tambah')} style={{
              padding: '9px 16px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}>+ Tambah</button>
          </div>
        </div>
        {searchOpen && (
          <div style={{ marginTop: '10px' }}>
            <input ref={searchRef} type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, kategori, akun..."
              style={{
                width: '100%', padding: '10px 14px',
                border: '1.5px solid var(--primary)', borderRadius: '10px',
                fontSize: '14px', background: 'var(--bg-card)', color: 'var(--text)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>

      {!isSearching && (
        <>
          {/* Filter periode full width */}
          <button onClick={() => setShowPicker(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '10px 16px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '10px', cursor: 'pointer', marginBottom: '14px',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>📅</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                {bulanList[filterBulan - 1]} {filterTahun}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>▾</span>
          </button>

          {/* Summary Card */}
          <div style={{
            background: cardConfigs[activeCard].gradient,
            borderRadius: '18px', padding: '18px 18px 14px',
            marginBottom: '16px', transition: 'background 0.3s ease',
          }}>
            {cardContent[activeCard]}
            <div style={{ display: 'flex', gap: '6px' }}>
              {cardConfigs.map((c, i) => (
                <button key={i} onClick={() => setActiveCard(i)} style={{
                  flex: 1, padding: '7px 0', borderRadius: '20px', border: 'none',
                  background: activeCard === i ? 'white' : 'rgba(255,255,255,0.2)',
                  color: activeCard === i ? cardConfigs[activeCard].color : 'rgba(255,255,255,0.6)',
                  fontWeight: activeCard === i ? '700' : '400',
                  fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                }}>{c.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
            {isSearching ? `Hasil "${searchQuery}"` : 'Daftar Transaksi'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{searchList.length} transaksi</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
        ) : searchList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isSearching ? '🔍' : '💸'}</div>
            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
              {isSearching ? 'Tidak ditemukan' : 'Belum ada transaksi'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {isSearching ? 'Coba kata kunci lain' : 'Tambah transaksi pertama Anda'}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {searchList.map((tx, i) => (
              <div key={tx.id}
              onClick={() => !isMobile && router.push(detailId === String(tx.id) ? '?' : `?detail=${tx.id}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: i < searchList.length - 1 ? '1px solid var(--border)' : 'none', background: detailId === tx.id ? 'var(--primary-light)' : 'transparent',
    cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: (tx.categories?.color || '#5B5F97') + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
                  }}>{tx.categories?.icon || '💸'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.description || '(Tanpa keterangan)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {tx.accounts?.name} · {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: tx.type === 'income' ? '#22C55E' : 'var(--danger)' }}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {tx.categories?.name || '-'}
                    </div>
                  </div>
                  {/* Edit */}
                  <button className="action-btn-mobile" onClick={() => router.push(`/dashboard/transaksi/tambah?id=${tx.id}`)} style={{
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    border: 'none', borderRadius: '6px', padding: '5px 7px',
                    cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                  }}>✏️</button>
                  {/* Hapus */}
                  <button className="action-btn-mobile" onClick={() => handleDelete(tx.id)} style={{
                    background: 'var(--danger-light)', color: 'var(--danger)',
                    border: 'none', borderRadius: '6px', padding: '5px 7px',
                    cursor: 'pointer', fontSize: '13px', lineHeight: 1,
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}