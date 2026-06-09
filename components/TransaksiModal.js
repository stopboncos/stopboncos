'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, PenLine, ArrowDown, ArrowUp } from 'lucide-react'

const ICON_BY_TYPE = {
  'Rekening Bank': (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="8" width="20" height="13" rx="2" fill={color} opacity="0.15" />
      <rect x="2" y="8" width="20" height="13" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M2 11h20" stroke={color} strokeWidth="1.5" />
      <path d="M12 3L2 8h20L12 3z" fill={color} opacity="0.3" />
      <path d="M12 3L2 8h20L12 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="6" y="14" width="3" height="2" rx="0.5" fill={color} />
    </svg>
  ),
  'Dompet Digital': (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="3" fill={color} opacity="0.15" />
      <rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth="1.5" />
      <path d="M15 13a1 1 0 100-2 1 1 0 000 2z" fill={color} />
      <path d="M2 10h20" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  'Kas': (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="7" width="22" height="14" rx="2" fill={color} opacity="0.15" />
      <rect x="1" y="7" width="22" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="14" r="3" stroke={color} strokeWidth="1.5" />
      <circle cx="5" cy="14" r="1" fill={color} />
      <circle cx="19" cy="14" r="1" fill={color} />
    </svg>
  ),
  'Investasi': (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 7 22 7 22 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Kartu Kredit': (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" fill={color} opacity="0.15" />
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M2 9h20" stroke={color} strokeWidth="1.5" />
      <rect x="6" y="15" width="4" height="1.5" rx="0.75" fill={color} />
    </svg>
  ),
}

const getAkunIcon = (type, color) => {
  const fn = ICON_BY_TYPE[type] || ICON_BY_TYPE['Kas']
  return fn(color || '#5B5F97')
}

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function TransaksiModal({ isOpen, onClose, onSaved, editData, accounts: accountsProp, categories: categoriesProp }) {
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
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (accountsProp) setAccounts(accountsProp)
    if (categoriesProp) setCategories(categoriesProp)
  }, [accountsProp, categoriesProp])

  useEffect(() => {
    if (!accountsProp && !categoriesProp && isOpen) fetchMeta()
  }, [isOpen])

  const fetchMeta = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: acc }, { data: cat }] = await Promise.all([
      supabase.from('accounts').select('id, name, type, color').eq('user_id', user.id),
      supabase.from('categories').select('id, name, icon, type').eq('user_id', user.id),
    ])
    setAccounts(acc || [])
    setCategories(cat || [])
  }

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

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const applyBalanceDelta = (balance, type, amount, direction = 'apply') => {
    const sign = direction === 'revert' ? -1 : 1
    if (type === 'income') return balance + sign * amount
    if (type === 'expense') return balance - sign * amount
    return balance
  }

  const handleSave = async () => {
    if (!form.amount || !form.account_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const amount = Number(form.amount)

    if (editData?.id) {
      const { data: oldTx } = await supabase
        .from('transactions').select('account_id, amount, type').eq('id', editData.id).single()
      if (oldTx) {
        const { data: oldAkun } = await supabase
          .from('accounts').select('id, balance').eq('id', oldTx.account_id).single()
        if (oldAkun) {
          await supabase.from('accounts').update({
            balance: applyBalanceDelta(oldAkun.balance, oldTx.type, oldTx.amount, 'revert')
          }).eq('id', oldAkun.id)
        }
      }
      await supabase.from('transactions').update({
        amount, account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description, date: form.date, type: form.type,
      }).eq('id', editData.id)
      const { data: newAkun } = await supabase
        .from('accounts').select('id, balance').eq('id', form.account_id).single()
      if (newAkun) {
        await supabase.from('accounts').update({
          balance: applyBalanceDelta(newAkun.balance, form.type, amount, 'apply')
        }).eq('id', newAkun.id)
      }
    } else {
      await supabase.from('transactions').insert({
        user_id: user.id, amount, account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description, date: form.date, type: form.type,
      })
      const { data: akun } = await supabase
        .from('accounts').select('id, balance').eq('id', form.account_id).single()
      if (akun) {
        await supabase.from('accounts').update({
          balance: applyBalanceDelta(akun.balance, form.type, amount, 'apply')
        }).eq('id', akun.id)
      }
    }

    setSaving(false)
    close()
    onSaved?.()
    window.dispatchEvent(new Event('refetch-transaksi'))
    const label = form.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
    showToast(`${label} ${fmt(amount)} berhasil disimpan!`)
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1px solid var(--border)', borderRadius: '10px',
    fontSize: '16px', background: 'var(--bg-card)', color: 'var(--text)',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    WebkitAppearance: 'none',
  }

  const pillBase = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 12px', borderRadius: '10px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    fontSize: '13px', fontWeight: '500', transition: 'all 0.15s',
    background: 'transparent', color: 'var(--text-muted)',
  }

  const pillActive = {
    borderColor: 'var(--primary)',
    background: 'var(--primary-light)',
    color: 'var(--primary)',
  }

  const filteredKat = categories.filter(c => c.type === form.type)

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
          background: '#FFF7ED', border: '1px solid #F97316',
          color: '#C2410C', padding: '12px 20px', borderRadius: '12px',
          fontSize: '13px', fontWeight: '600', zIndex: 400,
          boxShadow: '0 4px 16px rgba(249,115,22,0.2)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {isOpen && (
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
                <PenLine size={20} color="var(--primary)" />
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

            {/* Toggle Tipe */}
            {!editData && (
              <div style={{ display: 'flex', marginBottom: '18px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {[
                  { key: 'expense', label: 'Pengeluaran', icon: <ArrowDown size={14} />, activeColor: '#EF4444', activeBg: '#FEF2F2' },
                  { key: 'income', label: 'Pemasukan', icon: <ArrowUp size={14} />, activeColor: '#22C55E', activeBg: '#F0FDF4' },
                ].map((t, i) => (
                  <button
                    key={t.key}
                    onClick={() => setForm(f => ({ ...f, type: t.key, category_id: '' }))}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: 'none',
                      borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.15s',
                      background: form.type === t.key ? t.activeBg : 'transparent',
                      color: form.type === t.key ? t.activeColor : 'var(--text-muted)',
                    }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Jumlah */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Jumlah (Rp) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="number" inputMode="numeric" placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Sumber Dana — pills scrollable */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Sumber dana <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setForm(f => ({ ...f, account_id: a.id }))}
                    style={{ ...pillBase, ...(form.account_id === a.id ? pillActive : {}) }}
                  >
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      background: (a.color || '#5B5F97') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {getAkunIcon(a.type, a.color)}
                    </span>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori — pills scrollable */}
            {form.type !== 'transfer' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Kategori
                </label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {filteredKat.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setForm(f => ({ ...f, category_id: c.id }))}
                      style={{ ...pillBase, ...(form.category_id === c.id ? pillActive : {}) }}
                    >
                      {c.icon && <span style={{ fontSize: '14px' }}>{c.icon}</span>}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keterangan */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Keterangan
              </label>
              <textarea
                placeholder="mis. Makan siang, Gaji April..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Tanggal */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Tanggal
              </label>
              <input
                type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Tombol */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={close} style={{
                flex: 1, padding: '13px', borderRadius: '10px', border: 'none',
                background: 'var(--primary-light)', color: 'var(--primary)',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}>Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.amount || !form.account_id || !form.category_id}
                style={{
                  flex: 2, padding: '13px', borderRadius: '10px', border: 'none',
                  background: saving || !form.amount || !form.account_id || !form.category_id ? '#ccc' : '#F97316',
                  color: 'white', fontSize: '14px', fontWeight: '700',
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}