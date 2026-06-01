export const dynamic = 'force-dynamic'
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

const bulanList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const tahunList = Array.from({ length: 2030 - 2020 + 1 }, (_, i) => 2020 + i)

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

export default function LaporanPage() {
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [showPicker, setShowPicker] = useState(false)
  const [transaksi, setTransaksi] = useState([])
  const [kategori, setKategori] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const bulanStr = String(filterBulan).padStart(2, '0')
    const lastDay = new Date(filterTahun, filterBulan, 0).getDate()
    const [{ data: t }, { data: k }, { data: tg }] = await Promise.all([
      supabase.from('transactions')
        .select('*, accounts(name), categories(name, icon, color)')
        .eq('user_id', user.id)
        .gte('date', `${filterTahun}-${bulanStr}-01`)
        .lte('date', `${filterTahun}-${bulanStr}-${lastDay}`)
        .order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense'),
      supabase.from('targets').select('*, categories(name, icon, color)').eq('user_id', user.id),
    ])
    setTransaksi(t || [])
    setKategori(k || [])
    setTargets(tg || [])
    setLoading(false)
  }

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const totalMasuk = transaksi.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalKeluar = transaksi.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const selisih = totalMasuk - totalKeluar
  const savingRate = totalMasuk > 0 ? Math.round((selisih / totalMasuk) * 100) : 0

  const perKategori = kategori.map(k => {
    const total = transaksi.filter(t => t.category_id === k.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const target = targets.find(tg => tg.category_id === k.id)
    const pct = target ? Math.round((total / target.quota) * 100) : null
    return { ...k, total, target, pct }
  }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

  const harian = {}
  transaksi.forEach(tx => {
    if (!harian[tx.date]) harian[tx.date] = { masuk: 0, keluar: 0 }
    if (tx.type === 'income') harian[tx.date].masuk += tx.amount
    if (tx.type === 'expense') harian[tx.date].keluar += tx.amount
  })
  const harianList = Object.entries(harian).sort((a, b) => b[0].localeCompare(a[0]))
  const maxHarian = Math.max(...harianList.map(([, v]) => Math.max(v.masuk, v.keluar)), 1)

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Laporan Bulanan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Ringkasan keuangan Anda</p>
        </div>
        <button onClick={() => setShowPicker(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '10px',
          cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text)'
        }}>
          📅 {bulanList[filterBulan - 1]} {filterTahun} ▾
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
      ) : (
        <>
          {/* Ringkasan */}
          <div style={{ background: 'var(--primary)', borderRadius: '16px', padding: '24px', marginBottom: '20px', color: 'white' }}>
            <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Sisa Saldo Bulan Ini</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>{fmt(selisih)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.85, marginBottom: '16px' }}>
              <span>📈 Masuk: {fmt(totalMasuk)}</span>
              <span>📉 Keluar: {fmt(totalKeluar)}</span>
              <span>💰 Saving: {savingRate}%</span>
            </div>
            
          </div>

          {/* Cashflow Harian */}
          {harianList.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)', marginBottom: '16px' }}>Arus Kas Harian</div>
              {harianList.map(([date, val]) => (
                <div key={date} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>{new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span style={{ color: val.masuk - val.keluar >= 0 ? '#22C55E' : 'var(--danger)', fontWeight: '500' }}>
                      {val.masuk - val.keluar >= 0 ? '+' : ''}{fmt(val.masuk - val.keluar)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (val.masuk / maxHarian * 100) + '%', background: '#22C55E', borderRadius: '3px' }} />
                    </div>
                    <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (val.keluar / maxHarian * 100) + '%', background: 'var(--danger)', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22C55E', borderRadius: '2px', marginRight: '4px' }}></span>Masuk</span>
                <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '2px', marginRight: '4px' }}></span>Keluar</span>
              </div>
            </div>
          )}

          {/* Pengeluaran per Kategori */}
          {perKategori.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)', marginBottom: '16px' }}>Pengeluaran per Kategori</div>
              {perKategori.map(k => (
                <div key={k.id} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{k.icon}</span>
                      <span style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>{k.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text)' }}>{fmt(k.total)}</span>
                      {k.target && (
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
                          color: k.pct >= 100 ? 'var(--danger)' : k.pct >= k.target.warning_pct ? 'var(--accent)' : '#22C55E',
                          background: k.pct >= 100 ? 'var(--danger-light)' : k.pct >= k.target.warning_pct ? 'var(--accent-light)' : '#F0FDF4',
                        }}>{k.pct}%</span>
                      )}
                    </div>
                  </div>
                  {k.target && (
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px', transition: 'width 0.5s',
                        width: Math.min(k.pct, 100) + '%',
                        background: k.pct >= 100 ? 'var(--danger)' : k.pct >= k.target.warning_pct ? 'var(--accent)' : 'var(--primary)'
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detail Transaksi */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)', marginBottom: '16px',padding: '20px 20px 16px' }}>
              Detail Transaksi · {transaksi.length} transaksi
            </div>
            {transaksi.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>Belum ada transaksi bulan ini</div>
            ) : (
              transaksi.map((tx, i) => (
                <div onClick={() => {
  const next = selectedId === tx.id ? null : tx.id
  setSelectedId(next)
  router.replace(next ? `?detail=${next}` : '?', { scroll: false })
}} key={tx.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderBottom: i < transaksi.length - 1 ? '1px solid var(--border)' : 'none',
  cursor: 'pointer', background: selectedId === tx.id ? 'var(--primary-light)' : 'transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                      background: (tx.categories?.color || '#5B5F97') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                    }}>{tx.categories?.icon || '💸'}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.description || '(Tanpa keterangan)'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {tx.accounts?.name} · {new Date(tx.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', flexShrink: 0, marginLeft: '12px', color: tx.type === 'income' ? '#22C55E' : 'var(--danger)' }}>
                    {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}