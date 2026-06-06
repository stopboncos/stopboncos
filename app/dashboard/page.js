'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [activeCard, setActiveCard] = useState(0)
  const carouselRef = useRef(null)
  const chartRef = useRef(null)
  const router = useRouter()

  const [stats, setStats] = useState({ saldo: 0, pemasukan: 0, pengeluaran: 0, targetLewat: 0 })
  const [transaksi, setTransaksi] = useState([])
  const [targets, setTargets] = useState([])
  const [dailyTarget, setDailyTarget] = useState(null)
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)

  const CHART_HEIGHT = 60
  const BAR_WIDTH = 46
  const GAP = 10
  const DASH_RATIO = 0.3 // dashed line 30% dari atas = 70% dari bawah

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)

      const [{ data: txs }, { data: tgts }, { data: dt }] = await Promise.all([
        supabase.from('transactions')
          .select('*, categories(name, icon, color)')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase.from('targets')
          .select('*, categories(name, icon, color)')
          .eq('user_id', user.id),
        supabase.from('daily_target')
          .select('*')
          .eq('user_id', user.id)
          .single(),
      ])

      if (!txs) return

      const pemasukan = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const pengeluaran = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

      // 15 hari: 14 hari lalu + hari ini + 1 hari ke depan (besok)
      const days = []
      for (let i = 29; i >= -1; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        const total = txs
          .filter(t => t.type === 'expense' && t.date === dateStr)
          .reduce((s, t) => s + Number(t.amount), 0)
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
        days.push({
          date: dateStr,
          total,
          dayLabel: dayNames[d.getDay()],
          dateLabel: d.getDate(),
          isToday: dateStr === todayStr,
          isFuture: i < 0,
        })
      }
      setDailyData(days)
      setDailyTarget(dt || null)

      const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      const targetWithProgress = (tgts || []).map(target => {
        const spent = txs
          .filter(t => t.type === 'expense' && t.category_id === target.category_id && t.date >= startOfMonth)
          .reduce((s, t) => s + Number(t.amount), 0)
        const pct = Math.min((spent / Number(target.quota)) * 100, 100)
        return { ...target, spent, pct }
      })

      const targetLewat = targetWithProgress.filter(t => t.spent > Number(t.quota)).length
      setStats({ saldo: pemasukan - pengeluaran, pemasukan, pengeluaran, targetLewat })
      setTransaksi(txs.slice(0, 5))
      setTargets(targetWithProgress)
      setLoading(false)
    }
    fetchStats()
  }, [])

  // Scroll ke posisi hari ini kedua dari kanan (besok di paling kanan)
  useEffect(() => {
    if (!chartRef.current || dailyData.length === 0) return
    const todayIdx = dailyData.findIndex(d => d.isToday)
    if (todayIdx < 0) return
    // Hari ini di kedua dari kanan, besok di paling kanan
    // Scroll agar todayIdx berada di posisi (visible - 2) dari kiri
    setTimeout(() => {
      if (!chartRef.current) return
      const containerWidth = chartRef.current.offsetWidth
      const totalBarWidth = BAR_WIDTH + GAP
      const visibleBars = Math.floor(containerWidth / totalBarWidth)
      const targetScroll = (todayIdx - (visibleBars - 2)) * totalBarWidth
      chartRef.current.scrollLeft = Math.max(0, targetScroll)
    }, 150)
  }, [dailyData])

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const fmtShort = (n) => {
    if (n === 0) return ''
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'jt'
    if (n >= 1000) return Math.round(n / 1000) + 'k'
    return String(n)
  }

  const getBarHeight = (total, quota) => {
    if (total === 0) return 0
    const dashLineH = CHART_HEIGHT * (1 - DASH_RATIO) // tinggi dari bawah ke dashed line
    if (!quota) {
      // Tidak ada target, pakai maxDaily sebagai acuan
      return Math.min(CHART_HEIGHT, Math.max(8, total))
    }
    const h = (total / quota) * dashLineH
    return Math.min(CHART_HEIGHT, Math.max(8, h))
  }

  const getBarColor = (total, dt) => {
    if (total === 0) return null
    if (!dt) return 'var(--secondary)'
    const pct = (total / dt.quota) * 100
    if (pct > 100) return 'var(--danger)'
    if (pct >= dt.warning_pct) return 'var(--accent)'
    return '#22C55E'
  }

  const getLabelColor = (total, dt) => {
    if (!dt || total === 0) return 'var(--text-muted)'
    const pct = (total / dt.quota) * 100
    if (pct > 100) return 'var(--danger)'
    if (pct >= dt.warning_pct) return 'var(--accent)'
    return '#22C55E'
  }

  // Recalculate bar heights using maxDaily fallback when no dailyTarget
  const maxDaily = dailyTarget
    ? dailyTarget.quota // acuan dari target
    : Math.max(...dailyData.map(d => d.total), 1)

  const calcBarH = (total) => {
  if (total === 0) return 0
  const dashLineH = CHART_HEIGHT * (1 - DASH_RATIO) // 42px
  const h = (total / maxDaily) * dashLineH
  return Math.min(dashLineH * 1.5, Math.max(12, h)) // cap 63px = 42 + 50%
}

  const skeletonStyle = {
    background: 'var(--border)',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  const cards = [
    { label: 'Total Saldo', value: fmt(stats.saldo), icon: '👛', bg: 'var(--primary-light)', change: '+12%', changeColor: '#22C55E' },
    { label: 'Pemasukan', value: fmt(stats.pemasukan), icon: '📈', bg: '#F0FDF4', change: '+5%', changeColor: '#22C55E' },
    { label: 'Pengeluaran', value: fmt(stats.pengeluaran), icon: '📉', bg: 'var(--danger-light)', change: '+8%', changeColor: 'var(--danger)' },
    { label: 'Target Lewat', value: stats.targetLewat + ' kategori', icon: '🎯', bg: 'var(--accent-light)', change: '', changeColor: '' },
  ]

  const handleScroll = () => {
    if (!carouselRef.current) return
    const cardWidth = carouselRef.current.offsetWidth / 2
    setActiveCard(Math.round(carouselRef.current.scrollLeft / cardWidth))
  }

  const scrollToCard = (i) => {
    if (!carouselRef.current) return
    const cardWidth = carouselRef.current.offsetWidth / 2
    carouselRef.current.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
    setActiveCard(i)
  }

  const cardItem = (card, i, size) => (
    <div key={i} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', boxSizing: 'border-box',
      ...(size === 'carousel' ? {
        minWidth: 'calc(50% - 6px)', width: 'calc(50% - 6px)',
        scrollSnapAlign: 'start', flexShrink: 0,
      } : {})
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          ...(loading ? skeletonStyle : { background: card.bg })
        }}>
          {!loading && card.icon}
        </div>
        {!loading && card.change && (
          <span style={{
            fontSize: '12px', fontWeight: '600', color: card.changeColor,
            background: card.changeColor === 'var(--danger)' ? 'var(--danger-light)' : '#F0FDF4',
            padding: '4px 10px', borderRadius: '20px'
          }}>{card.change}</span>
        )}
      </div>
      {loading ? (
        <>
          <div style={{ ...skeletonStyle, height: '26px', width: '70%', marginBottom: '8px' }} />
          <div style={{ ...skeletonStyle, height: '13px', width: '45%' }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{card.value}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.label}</div>
        </>
      )}
    </div>
  )

  const dashLineFromTop = CHART_HEIGHT * DASH_RATIO

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        .chart-scroll::-webkit-scrollbar { display: none; }
        .chart-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Selamat datang 👋</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          {user?.email} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── DIAGRAM PENGELUARAN HARIAN ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '16px 0 0', marginBottom: '20px', overflow: 'hidden',
      }}>
        <div style={{ padding: '0 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>Pengeluaran Harian</div>
          {dailyTarget && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Target: {fmtShort(dailyTarget.quota)}/hari
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ height: CHART_HEIGHT + 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Memuat...
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Dashed line overlay — fixed position */}
            {dailyTarget && (
              <div style={{
                position: 'absolute',
                top: dashLineFromTop + 20, // +20 untuk label height di atas bar
                left: 0, right: 0,
                height: '1px',
                borderTop: '1.5px dashed var(--accent)',
                opacity: 0.5,
                zIndex: 2,
                pointerEvents: 'none',
              }} />
            )}

            <div
              ref={chartRef}
              className="chart-scroll"
              style={{
                overflowX: 'auto',
                display: 'flex',
                padding: '0 16px',
                gap: GAP,
                scrollSnapType: 'x mandatory',
              }}
            >
              {dailyData.map((day) => {
                const barH = calcBarH(day.total)
                const barColor = getBarColor(day.total, dailyTarget)
                const labelColor = getLabelColor(day.total, dailyTarget)
                const label = day.total > 0 ? fmtShort(day.total) : ''

                return (
                  <div
                    key={day.date}
                    style={{
                      minWidth: BAR_WIDTH, width: BAR_WIDTH,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      flexShrink: 0, paddingBottom: '12px',
                      scrollSnapAlign: 'start',
                    }}
                  >
                    {/* Area bar dengan label di puncak */}
                    <div style={{
                      width: '100%',
                      height: CHART_HEIGHT + 20, // +20 untuk ruang label
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {day.total > 0 && (
                        <>
                          {/* Bar */}
                          <div style={{
                            width: '28px',
                            height: barH,
                            borderRadius: '6px 6px 4px 4px',
                            background: barColor,
                            position: 'relative',
                            zIndex: 1,
                          }} />
                          {/* Label di puncak bar */}
                          <div style={{
                            position: 'absolute',
                            bottom: barH + 3,
                            fontSize: '10px',
                            fontWeight: '600',
                            color: labelColor,
                            whiteSpace: 'nowrap',
                            zIndex: 3,
                          }}>
                            {label}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Label hari & tanggal */}
                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                      <div style={{
                        fontSize: '11px',
                        color: day.isToday ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: day.isToday ? '700' : '400',
                      }}>{day.dayLabel}</div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: day.isToday ? '700' : '400',
                        color: day.isToday ? 'var(--text)' : 'var(--text-muted)',
                      }}>{day.dateLabel}</div>
                    </div>

                    {/* Segitiga penunjuk hari ini */}
                    {day.isToday && (
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: '7px solid var(--primary)',
                        // marginTop: '4px',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Grid */}
      <div className="stat-grid">
        {cards.map((card, i) => cardItem(card, i, 'sm'))}
      </div>

      {/* Mobile Carousel */}
      <div className="stat-carousel">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          style={{
            display: 'flex', overflowX: 'scroll',
            scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
            msOverflowStyle: 'none', gap: 12,
            marginLeft: '-16px', marginRight: '-16px',
            paddingLeft: '16px', paddingRight: '16px',
            scrollPaddingLeft: '16px',
          }}
        >
          {cards.map((card, i) => cardItem(card, i, 'carousel'))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {cards.slice(0, cards.length - 1).map((_, i) => (
            <div key={i} onClick={() => scrollToCard(i)} style={{
              width: activeCard === i ? '20px' : '6px', height: '6px',
              borderRadius: '3px', cursor: 'pointer', transition: 'all 0.3s',
              background: activeCard === i ? 'var(--primary)' : 'var(--border)',
            }} />
          ))}
        </div>
      </div>

      {/* Section row */}
      <div className="section-row" style={{ marginTop: '16px' }}>

        {/* Status Target */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Status Target</div>
            <button onClick={() => router.push('/dashboard/target')} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Kelola →</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ ...skeletonStyle, height: '16px', width: '40%' }} />
                    <div style={{ ...skeletonStyle, height: '16px', width: '25%' }} />
                  </div>
                  <div style={{ ...skeletonStyle, height: '8px', width: '100%' }} />
                </div>
              ))}
            </div>
          ) : targets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '14px' }}>Belum ada target</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {targets.map(t => {
                const isLewat = t.spent > Number(t.quota)
                const isWarning = !isLewat && t.pct >= t.warning_pct
                const barColor = isLewat ? '#EF4444' : isWarning ? '#F97316' : '#22C55E'
                const badgeBg = isLewat ? '#FEE2E2' : isWarning ? '#FFF7ED' : '#F0FDF4'
                const badgeLabel = isLewat ? 'Lewat!' : isWarning ? 'Warning' : 'Aman'
                return (
                  <div key={t.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{t.categories?.icon || '📦'}</span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{t.categories?.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: barColor, background: badgeBg, padding: '2px 8px', borderRadius: '99px' }}>{badgeLabel}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmt(t.spent)} / {fmt(Number(t.quota))}
                      </span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.pct}%`, height: '100%', borderRadius: '99px', background: barColor, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Transaksi Terkini */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Transaksi Terkini</div>
            <button onClick={() => router.push('/dashboard/transaksi')} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Lihat semua →</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ ...skeletonStyle, width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...skeletonStyle, height: '14px', width: '60%', marginBottom: '6px' }} />
                    <div style={{ ...skeletonStyle, height: '12px', width: '30%' }} />
                  </div>
                  <div style={{ ...skeletonStyle, height: '14px', width: '20%' }} />
                </div>
              ))}
            </div>
          ) : transaksi.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
              <div style={{ fontSize: '14px' }}>Belum ada transaksi</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transaksi.map((t, i) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: i < transaksi.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: t.categories?.color ? t.categories.color + '22' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0
                    }}>
                      {t.categories?.icon || '💸'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{t.description || t.categories?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.type === 'income' ? '#22C55E' : 'var(--danger)' }}>
                    {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}