'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [activeCard, setActiveCard] = useState(0)
  const carouselRef = useRef(null)
  const router = useRouter()
  const [stats, setStats] = useState({ saldo: 0, pemasukan: 0, pengeluaran: 0, targetLewat: 0 })
  const [transaksi, setTransaksi] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: txs } = await supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (!txs) return

      const pemasukan = txs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const pengeluaran = txs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      setStats({
        saldo: pemasukan - pengeluaran,
        pemasukan,
        pengeluaran,
        targetLewat: 0,
      })

      setTransaksi(txs.slice(0, 5))

      const { data: targets } = await supabase
        .from('targets')
        .select('*, categories(name, icon, color)')
        .eq('user_id', user.id)

      const now = new Date()
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const targetWithProgress = (targets || []).map(target => {
        const spent = txs
          .filter(t =>
            t.type === 'expense' &&
            t.category_id === target.category_id &&
            t.date >= startOfMonth
          )
          .reduce((sum, t) => sum + Number(t.amount), 0)

        const pct = Math.min((spent / Number(target.quota)) * 100, 100)
        return { ...target, spent, pct }
      })

      const targetLewat = targetWithProgress.filter(t => t.spent > Number(t.quota)).length

      setStats(prev => ({ ...prev, targetLewat }))
      setTargets(targetWithProgress)

      // set loading false SETELAH semua data siap
      setLoading(false)
    }

    fetchStats()
  }, [])

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

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
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      boxSizing: 'border-box',
      ...(size === 'carousel' ? {
        minWidth: 'calc(50% - 6px)',
        width: 'calc(50% - 6px)',
        scrollSnapAlign: 'start',
        flexShrink: 0,
      } : {})
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
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
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
            {card.value}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.label}</div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Selamat datang 👋</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          {user?.email} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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
            display: 'flex',
            overflowX: 'scroll',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            gap: 12,
            marginLeft: '-16px',
            marginRight: '-16px',
            paddingLeft: '16px',
            paddingRight: '16px',
            scrollPaddingLeft: '16px'
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

      {/* Section 2 */}
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
                        <span style={{
                          fontSize: '11px', fontWeight: '600', color: barColor,
                          background: badgeBg, padding: '2px 8px', borderRadius: '99px'
                        }}>
                          {badgeLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmt(t.spent)} / {fmt(Number(t.quota))}
                      </span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${t.pct}%`,
                        height: '100%',
                        borderRadius: '99px',
                        background: barColor,
                        transition: 'width 0.4s ease'
                      }} />
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
                  padding: '12px 0',
                  borderBottom: i < transaksi.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: t.categories?.color ? t.categories.color + '22' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0
                    }}>
                      {t.categories?.icon || '💸'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                        {t.description || t.categories?.name}
                      </div>
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