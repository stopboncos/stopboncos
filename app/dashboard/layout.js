'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/transaksi', label: 'Transaksi', icon: '💸' },
  { href: '/dashboard/target', label: 'Target', icon: '🎯' },
  { href: '/dashboard/laporan', label: 'Laporan Bulanan', icon: '📋' },
  { href: '/dashboard/akun', label: 'Dompet', icon: '👛' },
  { href: '/dashboard/kategori', label: 'Kategori', icon: '🏷️' },
  { href: '/dashboard/backup', label: 'Backup & Restore', icon: '💾' },
  { href: '/dashboard/langganan', label: 'Langganan', icon: '🥇' },
  { href: '/dashboard/profil', label: 'Profil', icon: '👤' },
]

// Halaman yang punya kolom 3
const detailPages = [
  '/dashboard/transaksi',
  '/dashboard/target',
  '/dashboard/laporan',
  '/dashboard/akun',
  '/dashboard/kategori',
]

const defaultDetailText = {
  '/dashboard/transaksi': { icon: '💸', text: 'Pilih transaksi untuk melihat detail' },
  '/dashboard/target':    { icon: '🎯', text: 'Pilih target untuk melihat detail' },
  '/dashboard/laporan':   { icon: '📋', text: 'Pilih laporan untuk melihat detail' },
  '/dashboard/akun':      { icon: '👛', text: 'Pilih akun untuk melihat detail' },
  '/dashboard/kategori':  { icon: '🏷️', text: 'Pilih kategori untuk melihat detail' },
}

function DetailPanel({ pathname, detailId }) {
  // Cari base path (tanpa sub-route tambah/edit)
  const basePath = detailPages.find(p => pathname.startsWith(p)) || null

  if (!basePath) return null

  if (!detailId) {
    const info = defaultDetailText[basePath]
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '12px',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: '40px' }}>{info?.icon}</div>
        <div style={{ fontSize: '14px', textAlign: 'center' }}>{info?.text}</div>
      </div>
    )
  }

  // Render detail per halaman
  return <DetailContent basePath={basePath} detailId={detailId} />
}

function DetailContent({ basePath, detailId }) {
  const router = useRouter()
  const pathname = usePathname()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [akuns, setAkuns] = useState([])
  const [kategori, setKategori] = useState([])
  const [form, setForm] = useState({})

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  useEffect(() => {
    if (!detailId) return
    setLoading(true)
    setEditMode(false)
    setData(null)
    fetchDetail()
  }, [detailId, basePath])

  const fetchDetail = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    let result = null

    if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
      const { data: tx } = await supabase.from('transactions')
        .select('*, accounts(name), categories(name, icon, color)')
        .eq('id', detailId).single()
      result = tx

      // Fetch akun & kategori untuk form edit
      const [{ data: a }, { data: k }] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
      ])
      setAkuns(a || [])
      setKategori(k || [])

      if (tx) setForm({
        type: tx.type,
        amount: String(tx.amount),
        account_id: tx.account_id || '',
        category_id: tx.category_id || '',
        description: tx.description || '',
        date: tx.date,
      })
    } else if (basePath === '/dashboard/akun') {
      const { data: ak } = await supabase.from('accounts').select('*').eq('id', detailId).single()
      result = ak
      if (ak) setForm({ name: ak.name, balance: String(ak.balance) })
    } else if (basePath === '/dashboard/kategori') {
      const { data: kat } = await supabase.from('categories').select('*').eq('id', detailId).single()
      result = kat
      if (kat) setForm({ name: kat.name, type: kat.type, icon: kat.icon || '', color: kat.color || '' })
    } else if (basePath === '/dashboard/target') {
      const { data: tgt } = await supabase.from('budgets').select('*, categories(name, icon, color)').eq('id', detailId).single()
      result = tgt
    } else if (basePath === '/dashboard/laporan') {
      const { data: tx } = await supabase.from('transactions').select('*, accounts(name), categories(name, icon, color)').eq('id', detailId).single()
      result = tx
    }

    setData(result)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
      // Revert saldo lama
      const { data: akunLama } = await supabase.from('accounts').select('*').eq('id', data.account_id).single()
      if (akunLama) {
        const reverted = data.type === 'income' ? akunLama.balance - data.amount : akunLama.balance + data.amount
        await supabase.from('accounts').update({ balance: reverted }).eq('id', akunLama.id)
      }
      // Update transaksi
      await supabase.from('transactions').update({
        type: form.type,
        amount: parseFloat(form.amount),
        account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description,
        date: form.date,
      }).eq('id', detailId)
      // Apply saldo baru
      const { data: akunBaru } = await supabase.from('accounts').select('*').eq('id', form.account_id).single()
      if (akunBaru) {
        const newBal = form.type === 'income' ? akunBaru.balance + parseFloat(form.amount) : akunBaru.balance - parseFloat(form.amount)
        await supabase.from('accounts').update({ balance: newBal }).eq('id', akunBaru.id)
      }
    } else if (basePath === '/dashboard/akun') {
      await supabase.from('accounts').update({ name: form.name }).eq('id', detailId)
    } else if (basePath === '/dashboard/kategori') {
      await supabase.from('categories').update({ name: form.name, type: form.type, icon: form.icon, color: form.color }).eq('id', detailId)
    }
    setSaving(false)
    setEditMode(false)
    fetchDetail()
  }

  const handleDelete = async () => {
    if (!confirm('Hapus data ini?')) return
    if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
      // Revert saldo
      const { data: akun } = await supabase.from('accounts').select('*').eq('id', data.account_id).single()
      if (akun) {
        const reverted = data.type === 'income' ? akun.balance - data.amount : akun.balance + data.amount
        await supabase.from('accounts').update({ balance: reverted }).eq('id', akun.id)
      }
      await supabase.from('transactions').delete().eq('id', detailId)
    } else if (basePath === '/dashboard/akun') {
      await supabase.from('accounts').delete().eq('id', detailId)
    } else if (basePath === '/dashboard/kategori') {
      await supabase.from('categories').delete().eq('id', detailId)
    }
    router.push(pathname)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '13px' }}>Memuat...</div>
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '13px' }}>Data tidak ditemukan</div>
    </div>
  )

  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, marginRight: '12px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', textAlign: 'right' }}>{value}</div>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '13px', background: 'var(--bg)',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const actionBtns = (
    <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
      {editMode ? (
        <>
          <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </>
      ) : (
        <>
          <button onClick={() => setEditMode(true)} style={{ flex: 1, padding: '10px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✏️ Edit</button>
          <button onClick={handleDelete} style={{ flex: 1, padding: '10px', background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🗑️ Hapus</button>
        </>
      )}
    </div>
  )

  // Transaksi & Laporan
  if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
    const filteredKat = kategori.filter(k => k.type === (form.type === 'income' ? 'income' : 'expense'))
    return (
      <div style={{ padding: '24px' }}>
        {/* Header icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px',
            background: (data.categories?.color || '#5B5F97') + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
          }}>{data.categories?.icon || '💸'}</div>
        </div>

        {/* Amount */}
        {editMode ? (
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            style={{ ...inputStyle, fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '8px', color: form.type === 'income' ? '#22C55E' : 'var(--danger)' }} />
        ) : (
          <div style={{ textAlign: 'center', fontSize: '26px', fontWeight: '800', color: data.type === 'income' ? '#22C55E' : 'var(--danger)', marginBottom: '8px' }}>
            {data.type === 'income' ? '+' : '−'}{fmt(data.amount)}
          </div>
        )}

        {/* Keterangan */}
        {editMode ? (
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Keterangan..." style={{ ...inputStyle, textAlign: 'center', marginBottom: '20px' }} />
        ) : (
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {data.description || '(Tanpa keterangan)'}
          </div>
        )}

        {/* Tipe */}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tipe</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[{ key: 'expense', label: '📉 Pengeluaran' }, { key: 'income', label: '📈 Pemasukan' }].map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, type: t.key, category_id: '' })} style={{
                  flex: 1, padding: '7px', border: '1px solid', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
                  borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                  background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                  color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        ) : row('Tipe', data.type === 'income' ? '📈 Pemasukan' : data.type === 'expense' ? '📉 Pengeluaran' : '🔄 Transfer')}

        {/* Akun */}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Akun</div>
            <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={inputStyle}>
              {akuns.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : row('Akun', data.accounts?.name || '—')}

        {/* Kategori */}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Kategori</div>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
              <option value="">Pilih kategori...</option>
              {filteredKat.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
            </select>
          </div>
        ) : row('Kategori', data.categories ? `${data.categories.icon} ${data.categories.name}` : '—')}

        {/* Tanggal */}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Tanggal</div>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
        ) : row('Tanggal', new Date(data.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}

        {actionBtns}
      </div>
    )
  }

  // Akun detail
  if (basePath === '/dashboard/akun') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👛</div>
          {editMode ? (
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, textAlign: 'center', fontSize: '16px', fontWeight: '700' }} />
          ) : (
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{data.name}</div>
          )}
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginTop: '8px' }}>{fmt(data.balance)}</div>
        </div>
        {!editMode && row('Nama Akun', data.name)}
        {!editMode && row('Saldo', fmt(data.balance))}
        {!editMode && data.type && row('Tipe', data.type)}
        {actionBtns}
      </div>
    )
  }

  // Kategori detail
  if (basePath === '/dashboard/kategori') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px',
            background: (data.color || '#5B5F97') + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
          }}>{data.icon || '🏷️'}</div>
          {editMode ? (
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, textAlign: 'center', fontSize: '16px', fontWeight: '700' }} />
          ) : (
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>{data.name}</div>
          )}
        </div>
        {editMode ? (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tipe</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[{ key: 'expense', label: '📉 Pengeluaran' }, { key: 'income', label: '📈 Pemasukan' }].map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, type: t.key })} style={{
                  flex: 1, padding: '7px', border: '1px solid', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
                  borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                  background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                  color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Icon</div>
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Emoji icon..." style={{ ...inputStyle, marginBottom: '12px' }} />
          </>
        ) : (
          <>
            {row('Nama', data.name)}
            {row('Tipe', data.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran')}
            {data.color && row('Warna', <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px', background: data.color, verticalAlign: 'middle' }} />)}
          </>
        )}
        {actionBtns}
      </div>
    )
  }

  // Target detail (view only)
  if (basePath === '/dashboard/target') {
    const pct = data.limit > 0 ? Math.min((data.used / data.limit) * 100, 100) : 0
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px', background: (data.categories?.color || '#5B5F97') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{data.categories?.icon || '🎯'}</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{data.categories?.name || data.name}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{data.period === 'monthly' ? 'Bulanan' : 'Mingguan'}</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Terpakai</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--accent)' : '#22C55E' }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--accent)' : '#22C55E', transition: 'width 0.3s' }} />
          </div>
        </div>
        {row('Terpakai', fmt(data.used || 0))}
        {row('Kuota', fmt(data.limit || 0))}
        {row('Sisa', fmt((data.limit || 0) - (data.used || 0)))}
        {row('Periode', data.period === 'monthly' ? 'Bulanan' : 'Mingguan')}
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────
// Komponen inner yang menggunakan useSearchParams
// Dibungkus Suspense di DashboardLayout agar build tidak error
// ─────────────────────────────────────────────────────────────
function DashboardLayoutInner({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()          // ← dipindah ke sini
  const detailId = searchParams.get('detail')
  const [user, setUser] = useState(null)
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  // Cek apakah halaman ini punya kolom 3
  const basePath = detailPages.find(p => pathname.startsWith(p) && !pathname.includes('/tambah')) || null
  const hasDetailCol = !isMobile && !!basePath

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div style={{ color: 'var(--text-muted)' }}>Memuat...</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* OVERLAY mobile */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* SIDEBAR — kolom 1 */}
      <nav style={{
        width: '240px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0,
        height: '100vh', zIndex: 100,
        overflowY: 'auto',
        transition: 'transform 0.3s ease',
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img className="app-logo" src="/logo.svg" alt="Stopboncos" />
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
          )}
        </div>

        {/* User Info */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: 'white', flexShrink: 0 }}>
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ padding: '12px 10px', flex: 1 }}>
          {menuItems.map(item => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <div key={item.href} onClick={() => router.push(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', cursor: 'pointer',
                fontSize: '13.5px', borderRadius: '8px',
                marginBottom: '2px', transition: 'all 0.15s',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                fontWeight: isActive ? '600' : '400',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>

        {/* Bottom */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '13.5px', borderRadius: '8px', color: 'var(--sidebar-text)', marginBottom: '2px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-active-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
          </div>
          <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '13.5px', borderRadius: '8px', color: 'var(--danger)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>🚪</span>
            <span>Keluar</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div style={{
        marginLeft: isMobile ? '0' : '240px',
        flex: 1, display: 'flex',
        height: '100vh', minWidth: 0, maxWidth: '100%',
        overflow: 'hidden',
      }}>
        {/* FLOATING BURGER - mobile only */}
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} style={{
            position: 'fixed', bottom: '24px', right: '24px',
            width: '48px', height: '48px',
            background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: '25%',
            fontSize: '30px', lineHeight: 1, cursor: 'pointer',
            zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '5px',
          }}>☰</button>
        )}

        {/* KOLOM 2 — konten halaman, scrollable */}
        <div style={{
          flex: hasDetailCol ? '0 0 auto' : 1,
          width: hasDetailCol ? 'calc(100% - 640px)' : '100%',
          padding: isMobile ? '16px' : '28px',
          minWidth: 0,
          borderRight: hasDetailCol ? '1px solid var(--border)' : 'none',
          overflowY: 'auto',
          height: '100vh',
        }}>
          {children}
        </div>

        {/* KOLOM 3 — fixed, tidak scroll bersama kolom 2 */}
        {hasDetailCol && (
          <div style={{
            width: '640px',
            flexShrink: 0,
            background: 'var(--bg-card)',
            overflowY: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
          }}>
            <DetailPanel pathname={pathname} detailId={detailId} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Export utama — bungkus DashboardLayoutInner dengan Suspense
// ─────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: 'var(--text-muted)' }}>Memuat...</div>
        </div>
      </div>
    }>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}