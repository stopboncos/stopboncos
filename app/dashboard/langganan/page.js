'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ALL_FEATURES = [
  { text: 'Pencatatan transaksi', free: true },
  { text: '1 dompet', free: true },
  { text: '3 kuota pengeluaran', free: true },
  { text: 'Multi dompet', free: false },
  { text: 'Kuota pengeluaran tanpa batas', free: false },
  { text: 'Export data', free: false },
  { text: 'Backup dan restore', free: false },
]

const FEATURES_PRO = ALL_FEATURES.map(f => f.text)

export default function LanggananPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [slotRemaining, setSlotRemaining] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const [{ data: prof }, { data: config }] = await Promise.all([
        supabase.from('users').select('plan, plan_expires_at, plan_purchased_at').eq('id', user.id).single(),
        supabase.from('config').select('value').eq('key', 'early_adopter_remaining').single(),
      ])
      setProfile(prof)
      setSlotRemaining(config ? parseInt(config.value) : null)
    }
    setLoading(false)
  }

  const getPlanInfo = () => {
    if (!profile?.plan || profile.plan === 'free') return { label: 'FREE', color: 'var(--text-muted)', bg: 'var(--bg)', border: 'var(--border)' }
    if (profile.plan === 'pro_lifetime') return { label: 'PRO LIFETIME', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' }
    if (profile.plan === 'pro_yearly') return { label: 'PRO TAHUNAN', color: 'var(--primary)', bg: 'var(--primary-light)', border: 'var(--primary)' }
    return { label: profile.plan.toUpperCase(), color: 'var(--text-muted)', bg: 'var(--bg)', border: 'var(--border)' }
  }

  const formatExpiry = () => {
    if (!profile?.plan_expires_at) return null
    return new Date(profile.plan_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const isPro = profile?.plan === 'pro_lifetime' || profile?.plan === 'pro_yearly'

  const handleUpgradeClick = (planName) => {
    setSelectedPlan(planName)
    setShowComingSoon(true)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '13px' }}>Memuat...</div>
      </div>
    </div>
  )

  const planInfo = getPlanInfo()

  const ctaBtn = (label, onClick, variant = 'primary') => (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px',
      background: variant === 'accent' ? 'var(--accent)' : variant === 'outline' ? 'transparent' : 'var(--primary)',
      color: variant === 'accent' ? '#1A1A2E' : variant === 'outline' ? 'var(--primary)' : 'white',
      border: variant === 'outline' ? '1.5px solid var(--primary)' : 'none',
      borderRadius: '10px', fontSize: '14px',
      fontWeight: '700', cursor: 'pointer',
    }}>{label}</button>
  )

  return (
    <div style={{ maxWidth: '760px' }}>
      <style>{`
        @keyframes pulse-banner {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,193,69,0.4); }
          50% { transform: scale(1.015); box-shadow: 0 0 0 8px rgba(255,193,69,0); }
        }
        .early-banner { animation: pulse-banner 2.5s ease-in-out infinite; }
        .paket-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: end;
        }
        @media (min-width: 768px) {
          .paket-grid {
            grid-template-columns: repeat(3, 1fr);
            align-items: end;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Langganan</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Pilih paket yang sesuai kebutuhanmu</p>
      </div>

      {/* Status plan — one line */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Paket kamu saat ini</span>
        <span style={{
          fontSize: '12.5px', fontWeight: '700',
          padding: '3px 10px', borderRadius: '20px',
          background: planInfo.bg, color: planInfo.color,
          border: `1px solid ${planInfo.border}`,
          letterSpacing: '0.03em',
        }}>{planInfo.label}</span>
        {profile?.plan === 'pro_yearly' && formatExpiry() && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>· Aktif hingga {formatExpiry()}</span>
        )}
        {profile?.plan === 'pro_lifetime' && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>· Selamanya ♾️</span>
        )}
      </div>

      {/* Early adopter banner */}
      {slotRemaining !== null && slotRemaining > 0 && (
        <div className="early-banner" style={{
          marginBottom: '60px', padding: '14px 18px',
          background: 'var(--accent-light)', border: '2px solid var(--accent)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>🎉 Harga Pengguna Pertama</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Dapatkan Pro Lifetime dengan harga spesial untuk 100 pengguna pertama.
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent)', lineHeight: 1 }}>{slotRemaining}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>slot tersisa</div>
          </div>
        </div>
      )}

      {slotRemaining === 0 && (
        <div style={{
          marginBottom: '28px', padding: '12px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)',
        }}>ℹ️ Slot pengguna pertama sudah habis. Harga normal berlaku.</div>
      )}

      {/* Kartu paket */}
      <div className="paket-grid">

        {/* FREE */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px', padding: '24px',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Diskon badge placeholder (kosong biar alignment sama) */}
          

          <div style={{ marginBottom: '4px', fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>Free</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Untuk pengguna baru</div>

          <div style={{ marginBottom: '6px', fontSize: '28px', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>Rp0</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Selamanya gratis</div>

          {/* Tombol placeholder transparan biar tinggi sama */}
          <div style={{ height: '44px', marginBottom: '20px' }} />

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', flex: 1 }}>
            {ALL_FEATURES.map(f => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                marginBottom: '10px', fontSize: '13px',
                color: f.free ? 'var(--text)' : 'var(--text-muted)',
                textDecoration: f.free ? 'none' : 'line-through',
                opacity: f.free ? 1 : 0.5,
              }}>
                <span style={{ color: f.free ? '#22C55E' : 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>
                  {f.free ? '✓' : '✕'}
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* PRO TAHUNAN */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px', padding: '24px',
          display: 'flex', flexDirection: 'column',
        }}>
          

          <div style={{ marginBottom: '4px', fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>Pro Tahunan</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Untuk pengguna aktif</div>

          <div style={{ marginBottom: '2px', fontSize: '28px', fontWeight: '800', color: 'var(--primary)', lineHeight: 1 }}>Rp99.000</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>per tahun</div>

          <div style={{ marginBottom: '20px' }}>
            {profile?.plan !== 'pro_yearly' && profile?.plan !== 'pro_lifetime'
              ? ctaBtn('Pilih Paket', () => handleUpgradeClick('Pro Tahunan'), 'outline')
              : <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>—</div>
            }
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', flex: 1 }}>
            {ALL_FEATURES.map(f => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                marginBottom: '10px', fontSize: '13px', color: 'var(--text)',
              }}>
                <span style={{ color: '#22C55E', flexShrink: 0, marginTop: '1px' }}>✓</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* PRO LIFETIME — lebih tinggi */}
        <div className='life-time' style={{
          background: 'var(--accent-light)',
          border: '2px solid var(--accent)',
          borderRadius: '16px',
          marginTop: '-32px', // naik ke atas
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header banner kuning */}
          <div style={{
            background: 'var(--accent)', color: 'white',
            fontSize: '12px', fontWeight: '800',
            padding: '8px 16px', textAlign: 'center',
            letterSpacing: '0.05em',
          }}>
            {slotRemaining > 0 ? '🔥 PENGGUNA PERTAMA' : '⭐ TERBAIK'}
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Badge diskon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
  <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>Pro Lifetime</div>
  {slotRemaining > 0 && (
    <div style={{ background: '#e7d0ff', color: '#612cc4', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>Hemat 50%</div>
  )}
</div>

            
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Bayar sekali, selamanya</div>

            {slotRemaining > 0 ? (
              <>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', lineHeight: 1, marginBottom: '4px' }}>Rp149.000</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through', marginBottom: '20px' }}>Rp299.000</div>
                
              </>
            ) : (
              <>
                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', lineHeight: 1, marginBottom: '4px' }}>Rp299.000</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>bayar sekali</div>
              </>
            )}

            <div style={{ marginBottom: '20px' }}>
              {profile?.plan !== 'pro_lifetime'
                ? ctaBtn('Pilih Paket', () => handleUpgradeClick('Pro Lifetime'), 'accent')
                : <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#15803D', fontWeight: '600' }}>✅ Paket aktif</div>
              }
            </div>

            <div style={{ borderTop: '1px solid rgba(255,193,69,0.3)', paddingTop: '16px', flex: 1 }}>
              {ALL_FEATURES.map(f => (
                <div key={f.text} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  marginBottom: '10px', fontSize: '13px', color: 'var(--text)',
                }}>
                  <span style={{ color: '#22C55E', flexShrink: 0, marginTop: '1px' }}>✓</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Coming Soon */}
      {showComingSoon && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px',
            padding: '32px 28px', width: '100%', maxWidth: '380px',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚀</div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Segera Hadir!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '24px' }}>
              Pembayaran untuk paket <strong style={{ color: 'var(--text)' }}>{selectedPlan}</strong> sedang dalam pengembangan. Pantau terus untuk update terbaru!
            </div>
            <button onClick={() => setShowComingSoon(false)} style={{
              width: '100%', padding: '11px',
              background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '10px',
              fontSize: '13.5px', fontWeight: '600', cursor: 'pointer',
            }}>Oke, Mengerti</button>
          </div>
        </div>
      )}
    </div>
  )
}