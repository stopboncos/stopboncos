'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function TambahTransaksiPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = !!editId

  const [akuns, setAkuns] = useState([])
  const [kategori, setKategori] = useState([])
  const [form, setForm] = useState({
    type: 'expense', amount: '', account_id: '',
    account_to_id: '', category_id: '', description: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const [originalTx, setOriginalTx] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: a }, { data: k }] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
    ])
    setAkuns(a || [])
    setKategori(k || [])

    if (isEdit) {
      const { data: tx } = await supabase.from('transactions')
        .select('*').eq('id', editId).single()
      if (tx) {
        setOriginalTx(tx)
        setForm({
          type: tx.type,
          amount: String(tx.amount),
          account_id: tx.account_id || '',
          account_to_id: tx.account_to_id || '',
          category_id: tx.category_id || '',
          description: tx.description || '',
          date: tx.date,
        })
      }
    } else {
      if (a?.length) setForm(f => ({ ...f, account_id: a[0].id }))
    }
  }

  const filteredKat = kategori.filter(k => k.type === (form.type === 'income' ? 'income' : 'expense'))

  const handleSave = async () => {
    if (!form.amount) { setError('Jumlah wajib diisi'); return }
    if (!form.account_id) { setError('Pilih akun dulu'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()

    if (isEdit) {
      const akun = akuns.find(a => a.id === form.account_id)
      const akunLama = akuns.find(a => a.id === originalTx.account_id)

      if (akunLama) {
        const revertedBalance = originalTx.type === 'income'
          ? akunLama.balance - originalTx.amount
          : akunLama.balance + originalTx.amount
        await supabase.from('accounts').update({ balance: revertedBalance }).eq('id', akunLama.id)
        akunLama.balance = revertedBalance
      }

      const { error: updateErr } = await supabase.from('transactions').update({
        type: form.type,
        amount: parseFloat(form.amount),
        account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description,
        date: form.date,
      }).eq('id', editId)

      if (updateErr) { setError(updateErr.message); setSaving(false); return }

      if (akun) {
        const newBalance = form.type === 'income'
          ? akun.balance + parseFloat(form.amount)
          : akun.balance - parseFloat(form.amount)
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', akun.id)
      }

    } else {
      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: form.type,
        amount: parseFloat(form.amount),
        account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description,
        date: form.date,
        source: 'website',
      })
      if (insertErr) { setError(insertErr.message); setSaving(false); return }

      const akun = akuns.find(a => a.id === form.account_id)
      if (akun) {
        const newBalance = form.type === 'income'
          ? akun.balance + parseFloat(form.amount)
          : akun.balance - parseFloat(form.amount)
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', akun.id)
      }

      if (form.type === 'transfer' && form.account_to_id) {
        const akunTujuan = akuns.find(a => a.id === form.account_to_id)
        if (akunTujuan) {
          await supabase.from('accounts').update({
            balance: akunTujuan.balance + parseFloat(form.amount)
          }).eq('id', akunTujuan.id)
        }
      }
    }

    router.push('/dashboard/transaksi')
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '12px'
        }}>← Kembali</button>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
          {isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}
        </h1>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Tipe */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>Tipe Transaksi</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'expense', label: '📉 Pengeluaran' },
              { key: 'income',  label: '📈 Pemasukan' },
              { key: 'transfer', label: '🔄 Transfer' }
            ].map(t => (
              <button key={t.key} onClick={() => setForm({ ...form, type: t.key, category_id: '' })} style={{
                flex: 1, padding: '8px', border: '1px solid',
                borderColor: form.type === t.key ? 'var(--primary)' : 'var(--border)',
                borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                background: form.type === t.key ? 'var(--primary-light)' : 'transparent',
                color: form.type === t.key ? 'var(--primary)' : 'var(--text-muted)',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Jumlah */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Jumlah (Rp) *</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="0" style={{
              width: '100%', padding: '12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '22px', fontWeight: '700',
              background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', boxSizing: 'border-box',
            }} />
        </div>

        {/* Akun */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
            {form.type === 'transfer' ? 'Akun Asal *' : 'Akun *'}
          </label>
          <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={{
            width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
          }}>
            <option value="">Pilih akun...</option>
            {akuns.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Akun Tujuan — transfer only */}
        {form.type === 'transfer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Akun Tujuan *</label>
            <select value={form.account_to_id} onChange={e => setForm({ ...form, account_to_id: e.target.value })} style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
            }}>
              <option value="">Pilih akun tujuan...</option>
              {akuns.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Kategori */}
        {form.type !== 'transfer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Kategori</label>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
            }}>
              <option value="">Pilih kategori...</option>
              {filteredKat.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
            </select>
          </div>
        )}

        {/* Keterangan */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Keterangan</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="mis. Makan siang, Gaji April..." style={{
              width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
            }} />
        </div>

        {/* Tanggal */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>Tanggal</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{
            width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
          }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.back()} style={{
            flex: 1, padding: '11px', background: 'var(--bg)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
          }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '11px', background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px',
            fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}</button>
        </div>
      </div>
    </div>
  )
}

export default function TambahTransaksiPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Memuat...</div>
    }>
      <TambahTransaksiPageInner />
    </Suspense>
  )
}