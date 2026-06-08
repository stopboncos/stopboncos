'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

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

  // Kalau props dikirim dari luar, pakai props. Kalau tidak (dipanggil dari layout), fetch sendiri.
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
      supabase.from('accounts').select('id, name').eq('user_id', user.id),
      supabase.from('categories').select('id, name, icon').eq('user_id', user.id),
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

  const handleSave = async () => {
    if (!form.amount || !form.account_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user.id,
      amount: Number(form.amount),
      account_id: form.account_id,
      category_id: form.category_id || null,
      description: form.description,
      date: form.date,
      type: form.type,
    }
    if (editData?.id) {
      await supabase.from('transactions').update(payload).eq('id', editData.id)
    } else {
      await supabase.from('transactions').insert(payload)
    }
    setSaving(false)
    close()
    onSaved?.()
    // Trigger refetch di halaman transaksi kalau sedang buka
    window.dispatchEvent(new Event('refetch-transaksi'))
  }

  if (!isOpen) return null

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    border: '1px solid var(--border)', borderRadius: '10px',
    fontSize: '14px', background: 'var(--bg-card)', color: 'var(--text)',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    WebkitAppearance: 'none',
  }

  return (
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
            <span style={{ fontSize: '20px' }}>✏️</span>
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

        {/* Jumlah */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Jumlah (Rp) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Tipe */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Tipe
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'expense', label: '📉 Pengeluaran' },
              { key: 'income', label: '📈 Pemasukan' },
              { key: 'transfer', label: '🔄 Transfer' },
            ].map(t => (
              <button key={t.key}
                onClick={() => setForm(f => ({ ...f, type: t.key, category_id: '' }))}
                style={{
                  flex: 1, padding: '8px 4px', border: '1px solid', fontSize: '11px', borderRadius: '8px', cursor: 'pointer',
                  borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                  background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                  color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Akun */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Akun <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={form.account_id}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
              style={{ ...inputStyle, paddingRight: '36px' }}
            >
              <option value="">Pilih akun</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
          </div>
        </div>

        {/* Akun Tujuan (transfer) */}
        {form.type === 'transfer' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Dompet Tujuan
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.account_to_id || ''}
                onChange={e => setForm(f => ({ ...f, account_to_id: e.target.value }))}
                style={{ ...inputStyle, paddingRight: '36px' }}
              >
                <option value="">Pilih dompet tujuan</option>
                {accounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
            </div>
          </div>
        )}

        {/* Kategori (non-transfer) */}
        {form.type !== 'transfer' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Kategori
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                style={{ ...inputStyle, paddingRight: '36px' }}
              >
                <option value="">Tanpa kategori</option>
                {categories
                  .filter(c => c.type === (form.type === 'income' ? 'income' : 'expense'))
                  .map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▾</span>
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
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tanggal */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Tombol */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={close} style={{
            flex: 1, padding: '13px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.amount || !form.account_id}
            style={{
              flex: 2, padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: saving || !form.amount || !form.account_id ? '#ccc' : '#F97316',
              color: 'white',
              fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </div>
  )
}