'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { IconPicker, findGroupForIcon } from '@/components/IconPicker'
import TransaksiModal from '@/components/TransaksiModal'
import { 
  LayoutDashboard, ArrowLeftRight, FileText, 
  Star, User, Settings, ChevronDown,
  Sun, Moon, LogOut, Home, Target, Plus, Banknote
} from 'lucide-react'


const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/dashboard/transaksi', label: 'Transaksi', icon: <ArrowLeftRight size={16} /> },
  { href: '/dashboard/laporan', label: 'Laporan Bulanan', icon: <FileText size={16} /> },
  { href: '/dashboard/langganan', label: 'Langganan', icon: <Star size={16} /> },
  { href: '/dashboard/profil', label: 'Profil', icon: <User size={16} /> },
]

const konfiguasiItems = [
  { href: '/dashboard/akun', label: 'Dompet' },
  { href: '/dashboard/kategori', label: 'Kategori' },
  { href: '/dashboard/target', label: 'Target' },
  { href: '/dashboard/backup', label: 'Backup & Restore' },
  { href: '/dashboard/log', label: 'Log Aktivitas' },
]

const detailPages = [
  '/dashboard/transaksi',
  '/dashboard/target',
  '/dashboard/laporan',
  '/dashboard/akun',
  '/dashboard/kategori',
]

const defaultDetailText = {
  '/dashboard/transaksi': { icon: '💸', text: 'Pilih transaksi untuk melihat detail' },
  '/dashboard/target': { icon: '🎯', text: 'Pilih target untuk melihat detail' },
  '/dashboard/laporan': { icon: '📋', text: 'Pilih laporan untuk melihat detail' },
  '/dashboard/akun': { icon: '👛', text: 'Pilih akun untuk melihat detail' },
  '/dashboard/kategori': { icon: '🏷️', text: 'Pilih kategori untuk melihat detail' },
}

// Bottom nav items (mobile)
const bottomNavItems = [
  { href: '/dashboard', label: 'Beranda', icon: Home },
  { href: '/dashboard/target', label: 'Target', icon: Target },
  { href: null, label: '+', icon: Plus, isAdd: true },
  { href: '/dashboard/transaksi', label: 'Transaksi', icon: Banknote },
  { href: '/dashboard/profil', label: 'Profil', icon: User },
]

function DetailPanel({ pathname, detailId }) {
  const basePath = detailPages.find(p => pathname.startsWith(p)) || null
  if (!basePath) return null
  if (!detailId) {
    const info = defaultDetailText[basePath]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '40px' }}>{info?.icon}</div>
        <div style={{ fontSize: '14px', textAlign: 'center' }}>{info?.text}</div>
      </div>
    )
  }
  return <DetailContent basePath={basePath} detailId={detailId} />
}

const logActivity = async (userId, entityType, entityId, action, oldData, newData) => {
  await supabase.from('activity_logs').insert({
    user_id: userId, entity_type: entityType, entity_id: entityId,
    action, old_data: oldData || null, new_data: newData || null,
  })
}

const upsertTargetHistory = async (userId, categoryId, quota, period, warningPct, isDeleted = false) => {
  const now = new Date()
  await supabase.from('target_history').upsert({
    user_id: userId, category_id: categoryId,
    quota, period, warning_pct: warningPct,
    bulan: now.getMonth() + 1, tahun: now.getFullYear(),
    is_deleted: isDeleted, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,category_id,bulan,tahun' })
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
  const [openGroup, setOpenGroup] = useState(0)
  const [txCount, setTxCount] = useState(0)

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
        .select('*, accounts!transactions_account_id_fkey(name), account_to:accounts!transactions_account_to_id_fkey(name), categories(name, icon, color)')
        .eq('id', detailId).single()
      result = tx
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
        account_to_id: tx.account_to_id || '',
        category_id: tx.category_id || '',
        description: tx.description || '',
        date: tx.date,
      })
    } else if (basePath === '/dashboard/akun') {
      const { data: ak } = await supabase.from('accounts').select('*').eq('id', detailId).single()
      result = ak
      if (ak) setForm({ name: ak.name, balance: String(ak.balance) })
      const { count: ac } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', detailId)
      setTxCount(ac || 0)
    } else if (basePath === '/dashboard/kategori') {
      const { data: kat } = await supabase.from('categories').select('*').eq('id', detailId).single()
      result = kat
      if (kat) setForm({ name: kat.name, type: kat.type, icon: kat.icon || '', color: kat.color || '' })
      setOpenGroup(findGroupForIcon(kat.icon || '🍽️'))
      const { count: kc } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', detailId)
      setTxCount(kc || 0)
      setOpenGroup(findGroupForIcon(kat.icon || '🍽️'))
    } else if (basePath === '/dashboard/target') {
      const { data: tgt } = await supabase.from('targets')
        .select('*, categories(name, icon, color)')
        .eq('id', detailId).single()
      result = tgt
      const { data: k } = await supabase.from('categories').select('*').eq('user_id', user.id).eq('type', 'expense')
      setKategori(k || [])
      if (tgt) setForm({
        category_id: tgt.category_id,
        quota: String(tgt.quota),
        period: tgt.period,
        warning_pct: tgt.warning_pct,
        start_date: tgt.start_date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
      })
    }

    setData(result)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
      const { data: akunLama } = await supabase.from('accounts').select('*').eq('id', data.account_id).single()
      if (akunLama) {
        let reverted = akunLama.balance
        if (data.type === 'income') reverted -= data.amount
        else if (data.type === 'expense') reverted += data.amount
        else if (data.type === 'transfer') reverted += data.amount
        await supabase.from('accounts').update({ balance: reverted }).eq('id', akunLama.id)
      }
      if (data.type === 'transfer' && data.account_to_id) {
        const { data: akunTujuanLama } = await supabase.from('accounts').select('*').eq('id', data.account_to_id).single()
        if (akunTujuanLama) {
          await supabase.from('accounts').update({ balance: akunTujuanLama.balance - data.amount }).eq('id', akunTujuanLama.id)
        }
      }
      await supabase.from('transactions').update({
        type: form.type, amount: parseFloat(form.amount),
        account_id: form.account_id,
        account_to_id: form.type === 'transfer' ? form.account_to_id : null,
        category_id: form.type === 'transfer' ? null : (form.category_id || null),
        description: form.description, date: form.date,
      }).eq('id', detailId)
      const { data: freshAkuns } = await supabase.from('accounts').select('*')
      const fa = freshAkuns || []
      const akunBaru = fa.find(a => a.id === form.account_id)
      if (akunBaru) {
        let newBal = akunBaru.balance
        if (form.type === 'income') newBal += parseFloat(form.amount)
        else if (form.type === 'expense') newBal -= parseFloat(form.amount)
        else if (form.type === 'transfer') newBal -= parseFloat(form.amount)
        await supabase.from('accounts').update({ balance: newBal }).eq('id', akunBaru.id)
      }
      if (form.type === 'transfer' && form.account_to_id) {
        const akunTujuanBaru = fa.find(a => a.id === form.account_to_id)
        if (akunTujuanBaru) {
          await supabase.from('accounts').update({ balance: akunTujuanBaru.balance + parseFloat(form.amount) }).eq('id', akunTujuanBaru.id)
        }
      }
    } else if (basePath === '/dashboard/akun') {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('accounts').update({ name: form.name }).eq('id', detailId)
      await logActivity(user.id, 'akun', detailId, 'update',
        { name: data.name },
        { name: form.name }
      )
    } else if (basePath === '/dashboard/kategori') {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('categories').update({ name: form.name, type: form.type, icon: form.icon, color: form.color }).eq('id', detailId)
      await logActivity(user.id, 'kategori', detailId, 'update',
        { name: data.name, type: data.type, icon: data.icon, color: data.color },
        { name: form.name, type: form.type, icon: form.icon, color: form.color }
      )
    } else if (basePath === '/dashboard/target') {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('targets').update({
        category_id: form.category_id, quota: parseFloat(form.quota),
        period: form.period, warning_pct: parseInt(form.warning_pct),
        start_date: form.start_date + '-01',
      }).eq('id', detailId)
      await upsertTargetHistory(user.id, form.category_id, parseFloat(form.quota), form.period, parseInt(form.warning_pct))
      await logActivity(user.id, 'target', detailId, 'update',
        { category_id: data.category_id, quota: data.quota, period: data.period, warning_pct: data.warning_pct },
        { category_id: form.category_id, quota: parseFloat(form.quota), period: form.period, warning_pct: parseInt(form.warning_pct) }
      )
    }
    setSaving(false)
    setEditMode(false)
    fetchDetail()
  }

  const handleDelete = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (basePath === '/dashboard/transaksi' || basePath === '/dashboard/laporan') {
      if (!confirm('Hapus data ini?')) return
      const { data: akun } = await supabase.from('accounts').select('*').eq('id', data.account_id).single()
      if (akun) {
        let reverted = akun.balance
        if (data.type === 'income') reverted -= data.amount
        else if (data.type === 'expense') reverted += data.amount
        else if (data.type === 'transfer') reverted += data.amount
        await supabase.from('accounts').update({ balance: reverted }).eq('id', akun.id)
      }
      if (data.type === 'transfer' && data.account_to_id) {
        const { data: akunTujuan } = await supabase.from('accounts').select('*').eq('id', data.account_to_id).single()
        if (akunTujuan) {
          await supabase.from('accounts').update({ balance: akunTujuan.balance - data.amount }).eq('id', akunTujuan.id)
        }
      }
      await supabase.from('transactions').delete().eq('id', detailId)

    } else if (basePath === '/dashboard/akun') {
      if (txCount > 0) {
        alert(`Tidak bisa dihapus — akun ini masih digunakan di ${txCount} transaksi.`)
        return
      }
      if (!confirm('Hapus akun ini?')) return
      await logActivity(user.id, 'akun', detailId, 'delete', {
        name: data.name, type: data.type, balance: data.balance, color: data.color, notes: data.notes,
      }, null)
      await supabase.from('accounts').delete().eq('id', detailId)

    } else if (basePath === '/dashboard/kategori') {
      if (txCount > 0) {
        alert(`Tidak bisa dihapus — kategori ini masih digunakan di ${txCount} transaksi.`)
        return
      }
      if (!confirm('Hapus kategori ini?')) return
      await logActivity(user.id, 'kategori', detailId, 'delete', {
        name: data.name, type: data.type, icon: data.icon, color: data.color,
      }, null)
      await supabase.from('categories').delete().eq('id', detailId)

    } else if (basePath === '/dashboard/target') {
      if (!confirm('Hapus target ini?')) return
      await upsertTargetHistory(user.id, data.category_id, data.quota, data.period, data.warning_pct, true)
      await logActivity(user.id, 'target', detailId, 'delete', {
        category_id: data.category_id, quota: data.quota, period: data.period, warning_pct: data.warning_pct,
      }, null)
      await supabase.from('targets').delete().eq('id', detailId)
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px', background: (data.categories?.color || '#5B5F97') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{data.categories?.icon || '💸'}</div>
        </div>
        {editMode ? (
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            style={{ ...inputStyle, fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '8px', color: form.type === 'income' ? '#22C55E' : 'var(--danger)' }} />
        ) : (
          <div style={{ textAlign: 'center', fontSize: '26px', fontWeight: '800', color: data.type === 'income' ? '#22C55E' : 'var(--danger)', marginBottom: '8px' }}>
            {data.type === 'income' ? '+' : '−'}{fmt(data.amount)}
          </div>
        )}
        {editMode ? (
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Keterangan..." style={{ ...inputStyle, textAlign: 'center', marginBottom: '20px' }} />
        ) : (
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {data.description || '(Tanpa keterangan)'}
          </div>
        )}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Tipe</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[{ key: 'expense', label: '📉 Pengeluaran' }, { key: 'income', label: '📈 Pemasukan' }, { key: 'transfer', label: '🔄 Transfer' }].map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, type: t.key, category_id: '' })} style={{
                  flex: 1, padding: '7px', border: '1px solid', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
                  borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                  background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                  color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                }}
                  disabled={data.type === 'transfer' && t.key !== 'transfer'}
                >{t.label}</button>
              ))}
            </div>
          </div>
        ) : row('Tipe', data.type === 'income' ? '📈 Pemasukan' : data.type === 'expense' ? '📉 Pengeluaran' : '🔄 Transfer')}
        {editMode ? (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Akun</div>
            <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={inputStyle}>
              {akuns.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : row('Akun', data.accounts?.name || '—')}
        {form.type === 'transfer' && editMode && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Dompet Tujuan</div>
            <select value={form.account_to_id} onChange={e => setForm({ ...form, account_to_id: e.target.value })} style={inputStyle}>
              <option value="">Pilih dompet tujuan...</option>
              {akuns.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        {form.type !== 'transfer' && (
          editMode ? (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>Kategori</div>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                <option value="">Pilih kategori...</option>
                {filteredKat.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>
          ) : row('Kategori', data.categories ? `${data.categories.icon} ${data.categories.name}` : '—')
        )}
        {data.type === 'transfer' && !editMode && row('Dompet Tujuan', data.account_to?.name || '—')}
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
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px', background: (data.color || '#5B5F97') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{data.icon || '🏷️'}</div>
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
                <button key={t.key}
                  onClick={() => txCount === 0 && setForm({ ...form, type: t.key })}
                  style={{
                    flex: 1, padding: '7px', border: '1px solid', fontSize: '12px', borderRadius: '8px',
                    cursor: txCount > 0 ? 'not-allowed' : 'pointer',
                    borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                    background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                    color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                    opacity: txCount > 0 && form.type !== t.key ? 0.4 : 1,
                  }}
                >{t.label}</button>
              ))}
            </div>
            {txCount > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                ⚠ Tipe tidak bisa diubah — kategori ini digunakan di {txCount} transaksi
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Icon</div>
            <div style={{ marginBottom: '12px' }}>
              <IconPicker
                selectedIcon={form.icon}
                onSelect={(icon) => setForm({ ...form, icon })}
                openGroup={openGroup}
                onToggleGroup={(gIdx) => setOpenGroup(openGroup === gIdx ? -1 : gIdx)}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Warna</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {['#5B5F97', '#FF6B6C', '#FFC145', '#22C55E', '#06B6D4', '#8B5CF6', '#F97316', '#EC4899'].map(w => (
                <div key={w} onClick={() => setForm({ ...form, color: w })} style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: w, cursor: 'pointer',
                  border: form.color === w ? '3px solid var(--text)' : '3px solid transparent',
                }} />
              ))}
            </div>
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

  // Target detail
  if (basePath === '/dashboard/target') {
    const PERIODE = ['Bulanan', 'Mingguan', 'Tahunan']
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px', background: (data.categories?.color || '#5B5F97') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
            {data.categories?.icon || '🎯'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
            {data.categories?.name || 'Target'}
          </div>
        </div>

        {editMode ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Kategori</div>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                {kategori.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Kuota Maksimal (Rp)</div>
              <input type="number" value={form.quota} onChange={e => setForm({ ...form, quota: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Periode</div>
                <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} style={inputStyle}>
                  {PERIODE.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Mulai</div>
                <input type="month" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Peringatan di — {form.warning_pct}%</div>
              <input type="range" min="50" max="95" step="5" value={form.warning_pct}
                onChange={e => setForm({ ...form, warning_pct: e.target.value })} style={{ width: '100%' }} />
            </div>
          </>
        ) : (
          <>
            {row('Kuota', fmt(data.quota))}
            {row('Periode', data.period)}
            {row('Peringatan', `${data.warning_pct}%`)}
            {row('Mulai', new Date(data.start_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))}
          </>
        )}

        {actionBtns}
      </div>
    )
  }

  return null
}

function DashboardLayoutInner({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('detail')
  const [user, setUser] = useState(null)
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [konfOpen, setKonfOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('konfOpen') === 'true'
  })

  // State untuk TransaksiModal di bottom nav
  const [addModalOpen, setAddModalOpen] = useState(false)

  const toggleKonf = () => {
    const next = !konfOpen
    setKonfOpen(next)
    localStorage.setItem('konfOpen', String(next))
  }
  const [isMobile, setIsMobile] = useState(true)

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
      {/* Overlay sidebar mobile */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      {/* Sidebar (desktop always visible, mobile slide-in) */}
      <nav style={{
        width: '240px', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
        height: '100vh', zIndex: 100, overflowY: 'auto', transition: 'transform 0.3s ease',
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img className="app-logo" src="/logo.png" alt="Stopboncos" />
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
          )}
        </div>

        <div style={{ padding: '12px 10px', flex: 1 }}>
          {/* Konfigurasi Accordion */}
          <div style={{ marginBottom: '15px' }}>
            <div onClick={toggleKonf} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', cursor: 'pointer',
              fontSize: '14px', borderRadius: '8px',
              color: konfOpen ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
              background: konfOpen ? 'var(--sidebar-active-bg)' : 'transparent',
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={16} />
                <span>Konfigurasi</span>
              </div>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: konfOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
            {konfOpen && (
              <div style={{ paddingLeft: '16px', marginTop: '2px' }}>
                {konfiguasiItems.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <div key={item.href} onClick={() => router.push(item.href)} style={{
                      padding: '8px 12px', cursor: 'pointer',
                      fontSize: '14px', borderRadius: '8px',
                      marginBottom: '1px', transition: 'all 0.15s',
                      background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      fontWeight: isActive ? '600' : '400',
                    }}>
                      {item.label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {menuItems.map((item, idx) => {
            if (item.type === 'section') return (
              <div key={idx} style={{
                padding: '12px 12px 4px',
                fontSize: '10px', fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.8px'
              }}>{item.label}</div>
            )
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <div key={item.href} onClick={() => router.push(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer',
                fontSize: '14px', borderRadius: '8px',
                marginBottom: '15px', transition: 'all 0.15s',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                fontWeight: isActive ? '600' : '400',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', cursor: 'pointer',
            fontSize: '14px', borderRadius: '8px',
            color: 'var(--sidebar-text)', marginBottom: '2px',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-active-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
          </div>
          <div onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', cursor: 'pointer',
            fontSize: '14px', borderRadius: '8px',
            color: 'var(--danger)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>🚪</span>
            <span>Keluar</span>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <div style={{ marginLeft: isMobile ? '0' : '240px', flex: 1, display: 'flex', height: '100vh', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{
          flex: hasDetailCol ? '0 0 auto' : 1,
          width: hasDetailCol ? 'calc(100% - 640px)' : '100%',
          padding: isMobile ? '16px 16px 80px' : '28px', // padding bawah lebih besar di mobile untuk navbar
          minWidth: 0,
          borderRight: hasDetailCol ? '1px solid var(--border)' : 'none',
          overflowY: 'auto', height: '100vh',
        }}>
          {children}
        </div>
        {hasDetailCol && (
          <div style={{ width: '640px', flexShrink: 0, background: 'var(--bg-card)', overflowY: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
            <DetailPanel pathname={pathname} detailId={detailId} />
          </div>
        )}
      </div>

      {/* Bottom Navbar — mobile only */}
      {isMobile && (
        <>
          {/* Modal tambah transaksi */}
          <TransaksiModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            onSaved={() => {
              window.dispatchEvent(new Event('refetch-transaksi'))
            }}
          />

          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--bg)',
            // borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            height: '100px',
            zIndex: 50,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            {bottomNavItems.map((item, i) => {
              if (item.isAdd) {
                return (
                  <div key="add" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                      onClick={() => setAddModalOpen(true)}
                      style={{
                        width: '52px', height: '52px',
                        borderRadius: '50%',
                        background: '#F97316',
                        border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
                        marginBottom: '8px',
                      }}
                    >
                      <Plus size={24} color="white" strokeWidth={2.5} />
                    </button>
                  </div>
                )
              }

              const Icon = item.icon
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <div
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '3px', cursor: 'pointer',
                    paddingTop: '6px',
                    color: isActive ? '#F97316' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{
                    fontSize: '10px',
                    fontWeight: isActive ? '700' : '400',
                    letterSpacing: '0.01em',
                  }}>
                    {item.label}
                  </span>
                </div>
              )
            })}
          </nav>
        </>
      )}
    </div>
  )
}

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