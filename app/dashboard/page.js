'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ScanLine,
  Wallet,
  LayoutGrid,
  FileText,
  DatabaseBackup,
  ClipboardList,
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const chartRef = useRef(null)
  const router = useRouter()

  const [stats, setStats] = useState({ saldo: 0, pemasukan: 0, pengeluaran: 0, targetLewat: 0 })
  const [transaksi, setTransaksi] = useState([])
  const [targets, setTargets] = useState([])
  const [dailyTarget, setDailyTarget] = useState(null)
  const [dailyData, setDailyData] = useState([])
  const [todayExpense, setTodayExpense] = useState(0)
  const [loading, setLoading] = useState(true)
  const [periodeLabel, setPeriodeLabel] = useState('')

  const CHART_HEIGHT = 60
  const BAR_WIDTH = 46
  const GAP = 10
  const DASH_RATIO = 0.3

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)

      const [{ data: txs }, { data: tgts }, { data: dt }, { data: akuns }] = await Promise.all([
        supabase.from('transactions')
          .select('*, categories(name, icon, color)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('targets')
          .select('*, categories(name, icon, color)')
          .eq('user_id', user.id),
        supabase.from('daily_target')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase.from('accounts')
          .select('balance')
          .eq('user_id', user.id),
      ])

      if (!txs) return

      const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const endOfMonthStr = endOfMonth.toISOString().slice(0, 10)

      const pemasukan = txs
        .filter(t => t.type === 'income' && t.date >= startOfMonth && t.date <= endOfMonthStr)
        .reduce((s, t) => s + Number(t.amount), 0)

      const pengeluaran = txs
        .filter(t => t.type === 'expense' && t.date >= startOfMonth && t.date <= endOfMonthStr)
        .reduce((s, t) => s + Number(t.amount), 0)

      const todayTotal = txs
        .filter(t => t.type === 'expense' && t.date === todayStr)
        .reduce((s, t) => s + Number(t.amount), 0)
      setTodayExpense(todayTotal)

      const periode = `${new Date(startOfMonth).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${endOfMonth.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`
      setPeriodeLabel(periode)

      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const days = []
      for (let i = 29; i >= -1; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        const total = txs
          .filter(t => t.type === 'expense' && t.date === dateStr)
          .reduce((s, t) => s + Number(t.amount), 0)
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

      const targetWithProgress = (tgts || []).map(target => {
        const spent = txs
          .filter(t => t.type === 'expense' && t.category_id === target.category_id && t.date >= startOfMonth)
          .reduce((s, t) => s + Number(t.amount), 0)
        const pct = Math.min((spent / Number(target.quota)) * 100, 100)
        return { ...target, spent, pct }
      })

      const targetLewat = targetWithProgress.filter(t => t.spent > Number(t.quota)).length
      const saldo = (akuns || []).reduce((s, a) => s + Number(a.balance), 0)
      setStats({ saldo, pemasukan, pengeluaran, targetLewat })
      setTransaksi(txs.slice(0, 5))
      setTargets(targetWithProgress)
      setLoading(false)
    }
    fetchStats()
  }, [])

  useEffect(() => {
    if (!chartRef.current || dailyData.length === 0) return
    const todayIdx = dailyData.findIndex(d => d.isToday)
    if (todayIdx < 0) return
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

  const maxDaily = dailyTarget
    ? dailyTarget.quota
    : Math.max(...dailyData.map(d => d.total), 1)

  const calcBarH = (total) => {
    if (total === 0) return 0
    const dashLineH = CHART_HEIGHT * (1 - DASH_RATIO)
    const h = (total / maxDaily) * dashLineH
    return Math.min(dashLineH * 1.5, Math.max(12, h))
  }

  const skeletonStyle = {
    background: 'var(--border)',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  const cards = [
    { label: 'Total Saldo', value: fmt(stats.saldo), icon: '👛', bg: 'var(--primary-light)' },
    { label: periodeLabel, value: fmt(stats.pemasukan), icon: '📈', bg: '#F0FDF4' },
    { label: periodeLabel, value: fmt(stats.pengeluaran), icon: '📉', bg: 'var(--danger-light)' },
    { label: 'Target Lewat', value: stats.targetLewat + ' kategori', icon: '🎯', bg: 'var(--accent-light)' },
  ]

  const menuItems = [
    { label: 'Scanner', icon: ScanLine, color: '#E8E8F4', iconColor: '#5b5f97', route: '/dashboard/scanner', soon: true },
    { label: 'Dompet', icon: Wallet, color: '#EDE9FE', iconColor: '#7C3AED', route: '/dashboard/akun', soon: false },
    { label: 'Kategori', icon: LayoutGrid, color: '#FCE7F3', iconColor: '#DB2777', route: '/dashboard/kategori', soon: false },
    { label: 'Laporan', icon: FileText, color: '#FEF9C3', iconColor: '#CA8A04', route: '/dashboard/laporan', soon: false },
    { label: 'Backup', icon: DatabaseBackup, color: '#DCFCE7', iconColor: '#16A34A', route: '/dashboard/backup', soon: false },
    { label: 'Log', icon: ClipboardList, color: '#FFE4E6', iconColor: '#E11D48', route: '/dashboard/log', soon: false },
  ]

  const heroQuota = dailyTarget?.quota || 0
  const heroSisa = Math.max(0, heroQuota - todayExpense)
  const heroPct = heroQuota > 0 ? Math.min((todayExpense / heroQuota) * 100, 100) : 0
  const heroOverLimit = heroQuota > 0 && todayExpense > heroQuota
  const dashLineFromTop = CHART_HEIGHT * DASH_RATIO

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        .chart-scroll::-webkit-scrollbar { display: none; }
        .chart-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .menu-scroll::-webkit-scrollbar { display: none; }
        .menu-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Selamat datang 👋</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          {user?.email} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Hero Card + Menu */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        {/* Hero Card */}
        {loading ? (
          <div style={{
            margin: '12px', borderRadius: '16px', padding: '24px',
            background: 'var(--border)', height: '160px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ) : dailyTarget ? (
          <div style={{
            margin: '12px', borderRadius: '16px', padding: '16px 18px',
            background: 'linear-gradient(135deg, #5b5f97 0%, #4a4e82 100%)',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontSize: '12px', opacity: 0.75, fontWeight: '500' }}>Sisa kuota hari ini</div>
              {heroOverLimit && (
                <div style={{
                  fontSize: '10px', fontWeight: '700',
                  background: 'rgba(239,68,68,0.3)', color: '#FCA5A5',
                  padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap',
                }}>⚠️ Lewat {fmtShort(todayExpense - heroQuota)}</div>
              )}
            </div>
            <div style={{
              fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '1px',
              color: heroOverLimit ? '#FCA5A5' : '#fff',
            }}>{fmt(heroSisa)}</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '10px' }}>
              dari target {fmt(heroQuota)}/hari
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: '99px',
              height: '6px', overflow: 'hidden', marginBottom: '12px',
            }}>
              <div style={{
                width: `${heroPct}%`, height: '100%', borderRadius: '99px',
                background: heroOverLimit ? '#EF4444' : heroPct >= (dailyTarget.warning_pct || 80) ? '#F97316' : '#A5F3A5',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '1px' }}>Total saldo</div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{fmt(stats.saldo)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '1px' }}>Terpakai hari ini</div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{fmt(todayExpense)}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Menu Grid */}
        <div
          className="menu-scroll"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: '4px',
            padding: '12px 16px 16px',
          }}
        >
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                onClick={() => !item.soon && router.push(item.route)}
                style={{
                  minWidth: '72px', width: '72px', flexShrink: 0,
                  scrollSnapAlign: 'start',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  cursor: item.soon ? 'default' : 'pointer',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: item.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color={item.iconColor} strokeWidth={1.8} />
                  </div>
                  {item.soon && (
                    <div style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: '#5b5f97', color: '#fff',
                      fontSize: '8px', fontWeight: '700',
                      padding: '2px 5px', borderRadius: '6px',
                      letterSpacing: '0.3px', lineHeight: '1.4',
                    }}>SOON</div>
                  )}
                </div>
                <div style={{
                  fontSize: '11px', fontWeight: '500',
                  color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap',
                }}>{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Diagram Pengeluaran Harian */}
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
            {dailyTarget && (
              <div style={{
                position: 'absolute',
                top: dashLineFromTop + 20,
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
                overflowX: 'auto', display: 'flex',
                padding: '0 16px', gap: GAP,
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
                      flexShrink: 0, paddingBottom: '12px', scrollSnapAlign: 'start',
                    }}
                  >
                    <div style={{
                      width: '100%', height: CHART_HEIGHT + 20,
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {day.total > 0 && (
                        <>
                          <div style={{
                            width: '28px', height: barH,
                            borderRadius: '6px 6px 4px 4px',
                            background: barColor,
                            position: 'relative', zIndex: 1,
                          }} />
                          <div style={{
                            position: 'absolute', bottom: barH + 3,
                            fontSize: '10px', fontWeight: '600',
                            color: labelColor, whiteSpace: 'nowrap', zIndex: 3,
                          }}>{label}</div>
                        </>
                      )}
                    </div>
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
                    {day.isToday && (
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: '7px solid var(--primary)',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section: Target + Transaksi */}
      <div className="section-row" style={{ marginBottom: '16px' }}>

        {/* Status Target */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Pantau Pengeluaran</div>
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
                  <div style={{
                    fontSize: '14px', fontWeight: '600',
                    color: t.type === 'income' ? '#22C55E' : t.type === 'transfer' ? 'var(--text-muted)' : 'var(--danger)'
                  }}>
                    {t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : '-'}{fmt(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat Grid 2x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '16px',
      }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            boxSizing: 'border-box',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', marginBottom: '8px',
              ...(loading ? skeletonStyle : { background: card.bg })
            }}>
              {!loading && card.icon}
            </div>
            {loading ? (
              <>
                <div style={{ ...skeletonStyle, height: '18px', width: '70%', marginBottom: '6px' }} />
                <div style={{ ...skeletonStyle, height: '11px', width: '50%' }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>{card.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}