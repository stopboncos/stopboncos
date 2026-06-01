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
  const [stats] = useState({ saldo: 0, pemasukan: 0, pengeluaran: 0, targetLewat: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

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
          background: card.bg, borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px'
        }}>{card.icon}</div>
        {card.change && (
          <span style={{
            fontSize: '12px', fontWeight: '600', color: card.changeColor,
            background: card.changeColor === 'var(--danger)' ? 'var(--danger-light)' : '#F0FDF4',
            padding: '4px 10px', borderRadius: '20px'
          }}>{card.change}</span>
        )}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
        {card.value}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.label}</div>
    </div>
  )

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Status Target</div>
            <button onClick={() => router.push('/dashboard/target')} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Kelola →</button>
          </div>
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
            <div style={{ fontSize: '14px' }}>Belum ada target</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Buat target pengeluaran Anda</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>Transaksi Terkini</div>
            <button onClick={() => router.push('/dashboard/transaksi')} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Lihat semua →</button>
          </div>
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
            <div style={{ fontSize: '14px' }}>Belum ada transaksi</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Tambah transaksi pertama Anda</div>
          </div>
        </div>
      </div>
    </div>
  )
}