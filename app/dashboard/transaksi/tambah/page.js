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
    if (!form.account_id) { setError('Pilih dompet dulu'); return }
    if (form.type === 'transfer' && !form.account_to_id) { setError('Pilih dompet tujuan'); return }
    if (form.type === 'transfer' && form.account_id === form.account_to_id) { setError('Dompet asal dan tujuan tidak boleh sama'); return }

    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const amount = parseFloat(form.amount)

    if (isEdit) {
      // ── Revert balance transaksi lama ──────────────────────────────────────
      const akunAsal = akuns.find(a => a.id === originalTx.account_id)
      if (akunAsal) {
        let revertedBalance = akunAsal.balance
        if (originalTx.type === 'income') revertedBalance -= originalTx.amount
        else if (originalTx.type === 'expense') revertedBalance += originalTx.amount
        else if (originalTx.type === 'transfer') revertedBalance += originalTx.amount
        await supabase.from('accounts').update({ balance: revertedBalance }).eq('id', akunAsal.id)
      }

      // Revert dompet tujuan lama (kalau sebelumnya transfer)
      if (originalTx.type === 'transfer' && originalTx.account_to_id) {
        const akunTujuanLama = akuns.find(a => a.id === originalTx.account_to_id)
        if (akunTujuanLama) {
          await supabase.from('accounts').update({
            balance: akunTujuanLama.balance - originalTx.amount
          }).eq('id', akunTujuanLama.id)
        }
      }

      // ── Update transaksi ───────────────────────────────────────────────────
      const { error: updateErr } = await supabase.from('transactions').update({
        type: form.type,
        amount,
        account_id: form.account_id,
        account_to_id: form.type === 'transfer' ? form.account_to_id : null,
        category_id: form.type === 'transfer' ? null : (form.category_id || null),
        description: form.description,
        date: form.date,
      }).eq('id', editId)

      if (updateErr) { setError(updateErr.message); setSaving(false); return }

      // ── Apply balance baru ─────────────────────────────────────────────────
      // Refresh akun setelah revert
      const { data: freshAkuns } = await supabase.from('accounts').select('*').eq('user_id', user.id)
      const fa = (freshAkuns || [])

      const newAkunAsal = fa.find(a => a.id === form.account_id)
      if (newAkunAsal) {
        let newBalance = newAkunAsal.balance
        if (form.type === 'income') newBalance += amount
        else if (form.type === 'expense') newBalance -= amount
        else if (form.type === 'transfer') newBalance -= amount
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', newAkunAsal.id)
      }

      if (form.type === 'transfer' && form.account_to_id) {
        const newAkunTujuan = fa.find(a => a.id === form.account_to_id)
        if (newAkunTujuan) {
          await supabase.from('accounts').update({
            balance: newAkunTujuan.balance + amount
          }).eq('id', newAkunTujuan.id)
        }
      }

    } else {
      // ── Insert transaksi baru ──────────────────────────────────────────────
      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: form.type,
        amount,
        account_id: form.account_id,
        account_to_id: form.type === 'transfer' ? form.account_to_id : null,
        category_id: form.type === 'transfer' ? null : (form.category_id || null),
        description: form.description,
        date: form.date,
        source: 'website',
      })
      if (insertErr) { setError(insertErr.message); setSaving(false); return }

      // Update balance asal
      const akunAsal = akuns.find(a => a.id === form.account_id)
      if (akunAsal) {
        let newBalance = akunAsal.balance
        if (form.type === 'income') newBalance += amount
        else if (form.type === 'expense') newBalance -= amount
        else if (form.type === 'transfer') newBalance -= amount
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', akunAsal.id)
      }

      // Update balance tujuan (transfer)
      if (form.type === 'transfer' && form.account_to_id) {
        const akunTujuan = akuns.find(a => a.id === form.account_to_id)
        if (akunTujuan) {
          await supabase.from('accounts').update({
            balance: akunTujuan.balance + amount
          }).eq('id', akunTujuan.id)
        }
      }
    }

    router.push('/dashboard/transaksi')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--bg)',
    color: 'var(--text)', boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: '13px', fontWeight: '500', color: 'var(--text)',
    display: 'block', marginBottom: '6px',
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

        {/* Tipe — transfer tidak punya pemasukan/pengeluaran */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Tipe Transaksi</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'expense',  label: '📉 Pengeluaran' },
              { key: 'income',   label: '📈 Pemasukan' },
              { key: 'transfer', label: '🔄 Transfer' },
            ].map(t => (
              <button key={t.key} onClick={() => setForm({ ...form, type: t.key, category_id: '', account_to_id: '' })} style={{
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
          <label style={labelStyle}>Jumlah (Rp) *</label>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="0" style={{
              ...inputStyle, fontSize: '22px', fontWeight: '700', textAlign: 'center',
            }} />
        </div>

        {/* Dompet Asal */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{form.type === 'transfer' ? 'Dompet Asal *' : 'Dompet *'}</label>
          <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={inputStyle}>
            <option value="">Pilih dompet...</option>
            {akuns.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Dompet Tujuan — transfer only */}
        {form.type === 'transfer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Dompet Tujuan *</label>
            <select value={form.account_to_id} onChange={e => setForm({ ...form, account_to_id: e.target.value })} style={inputStyle}>
              <option value="">Pilih dompet tujuan...</option>
              {akuns.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Kategori — hanya untuk income/expense */}
        {form.type !== 'transfer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Kategori</label>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
              <option value="">Pilih kategori...</option>
              {filteredKat.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
            </select>
          </div>
        )}

        {/* Keterangan */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Keterangan</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="mis. Makan siang, Gaji April..."
            style={inputStyle} />
        </div>

        {/* Tanggal */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Tanggal</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
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