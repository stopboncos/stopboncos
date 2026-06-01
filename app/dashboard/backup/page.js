'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function BackupPage() {
  const [user, setUser] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)

  // Restore
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreData, setRestoreData] = useState(null)
  const [restoreError, setRestoreError] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState(null)
  const [restoreProgress, setRestoreProgress] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // ── BACKUP ──────────────────────────────────────────────
  const handleBackup = async () => {
    setBackupLoading(true)
    setBackupMsg(null)
    try {
      const [
        { data: accounts },
        { data: categories },
        { data: targets },
        { data: transactions },
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('targets').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
      ])

      const payload = {
        exported_at: new Date().toISOString(),
        version: '1',
        user_id: user.id,
        data: { accounts, categories, targets, transactions },
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `stopboncos-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)

      setBackupMsg({ type: 'success', text: 'File backup berhasil diunduh. Simpan file ini di tempat yang aman — file ini dapat digunakan untuk memulihkan seluruh data kamu.' })
    } catch (e) {
      setBackupMsg({ type: 'error', text: 'Gagal membuat backup. Coba lagi.' })
    }
    setBackupLoading(false)
  }

  // ── RESTORE: pilih file ──────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    setRestoreFile(null)
    setRestoreData(null)
    setRestoreError(null)
    setRestoreMsg(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        // Validasi struktur
        if (
          !parsed.version ||
          !parsed.data ||
          !Array.isArray(parsed.data.accounts) ||
          !Array.isArray(parsed.data.categories) ||
          !Array.isArray(parsed.data.targets) ||
          !Array.isArray(parsed.data.transactions)
        ) {
          setRestoreError('File tidak valid. Pastikan file ini adalah backup dari Stopboncos.')
          return
        }
        setRestoreFile(file)
        setRestoreData(parsed)
      } catch {
        setRestoreError('File tidak dapat dibaca. Pastikan format file adalah JSON yang valid.')
      }
    }
    reader.readAsText(file)
    // Reset input agar bisa pilih file yang sama lagi
    e.target.value = ''
  }

  const handleOpenConfirm = () => {
    setConfirmChecked(false)
    setShowConfirmModal(true)
  }

  // ── RESTORE: eksekusi ────────────────────────────────────
  const handleRestore = async () => {
    setRestoreLoading(true)
    setRestoreProgress('Menghapus data lama...')
    try {
      const uid = user.id

      // Hapus urutan terbalik (transactions → targets → categories → accounts)
      await supabase.from('transactions').delete().eq('user_id', uid)
      await supabase.from('targets').delete().eq('user_id', uid)
      await supabase.from('categories').delete().eq('user_id', uid)
      await supabase.from('accounts').delete().eq('user_id', uid)

      const { accounts, categories, targets, transactions } = restoreData.data

      // Insert urutan foreign key (accounts → categories → targets → transactions)
      setRestoreProgress('Memulihkan akun...')
      if (accounts?.length) await supabase.from('accounts').insert(accounts)

      setRestoreProgress('Memulihkan kategori...')
      if (categories?.length) await supabase.from('categories').insert(categories)

      setRestoreProgress('Memulihkan target...')
      if (targets?.length) await supabase.from('targets').insert(targets)

      setRestoreProgress('Memulihkan transaksi...')
      if (transactions?.length) {
        // Insert dalam batch 500 untuk menghindari payload terlalu besar
        const BATCH = 500
        for (let i = 0; i < transactions.length; i += BATCH) {
          await supabase.from('transactions').insert(transactions.slice(i, i + BATCH))
        }
      }

      setRestoreProgress(null)
      setShowConfirmModal(false)
      setRestoreFile(null)
      setRestoreData(null)
      setRestoreMsg({ type: 'success', text: `Restore berhasil! ${transactions?.length || 0} transaksi, ${accounts?.length || 0} akun, ${categories?.length || 0} kategori, dan ${targets?.length || 0} target telah dipulihkan.` })
    } catch (e) {
      setRestoreProgress(null)
      setRestoreMsg({ type: 'error', text: 'Restore gagal. Data lama mungkin sudah terhapus sebagian. Coba restore ulang dari file backup.' })
    }
    setRestoreLoading(false)
    setTimeout(() => setRestoreMsg(null), 8000)
  }

  const fmt = (n) => n.toLocaleString('id-ID')

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  }

  const btnPrimary = (disabled) => ({
    padding: '11px 24px',
    background: disabled ? 'var(--secondary)' : 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 0.15s',
  })

  const btnDanger = (disabled) => ({
    padding: '11px 24px',
    background: disabled ? 'var(--secondary)' : 'var(--danger)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  })

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Backup & Restore</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Ekspor dan pulihkan seluruh data kamu</p>
      </div>

      {/* ── BACKUP ── */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>💾 Backup Data</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Unduh seluruh data kamu (akun, kategori, target, dan transaksi) dalam format JSON. Simpan file ini di tempat yang aman.
          </div>
        </div>

        <button onClick={handleBackup} disabled={backupLoading} style={btnPrimary(backupLoading)}>
          {backupLoading ? '⏳ Menyiapkan...' : '⬇️ Download Backup'}
        </button>

        {backupMsg && (
          <div style={{
            marginTop: '14px', padding: '12px 14px',
            background: backupMsg.type === 'success' ? '#F0FDF4' : 'var(--danger-light)',
            border: `1px solid ${backupMsg.type === 'success' ? '#BBF7D0' : 'var(--danger)'}`,
            borderRadius: '10px',
            fontSize: '13px',
            color: backupMsg.type === 'success' ? '#15803D' : 'var(--danger)',
            lineHeight: '1.6',
          }}>
            {backupMsg.type === 'success' ? '✅ ' : '❌ '}{backupMsg.text}
          </div>
        )}
      </div>

      {/* ── RESTORE ── */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>♻️ Restore Data</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Pulihkan data dari file backup JSON. Seluruh data yang ada saat ini akan <strong style={{ color: 'var(--danger)' }}>dihapus permanen</strong> dan diganti dengan data dari file backup.
          </div>
        </div>

        {/* File picker */}
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '11px 24px',
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          📂 Pilih File Backup
        </button>

        {/* Error validasi */}
        {restoreError && (
          <div style={{
            marginTop: '12px', padding: '12px 14px',
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            borderRadius: '10px',
            fontSize: '13px', color: 'var(--danger)',
          }}>
            ❌ {restoreError}
          </div>
        )}

        {/* Preview file valid */}
        {restoreData && (
          <div style={{
            marginTop: '14px', padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px' }}>
              📄 {restoreFile.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: '14px' }}>
              {[
                ['Akun', restoreData.data.accounts.length],
                ['Kategori', restoreData.data.categories.length],
                ['Target', restoreData.data.targets.length],
                ['Transaksi', restoreData.data.transactions.length],
              ].map(([label, count]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text)' }}>{fmt(count)} data</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Dibackup pada {new Date(restoreData.exported_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
            </div>

            <button
              onClick={handleOpenConfirm}
              style={{ ...btnDanger(false), marginTop: '14px', width: '100%' }}
            >
              ♻️ Restore Sekarang
            </button>
          </div>
        )}

        {/* Pesan hasil restore */}
        {restoreMsg && (
          <div style={{
            marginTop: '14px', padding: '12px 14px',
            background: restoreMsg.type === 'success' ? '#F0FDF4' : 'var(--danger-light)',
            border: `1px solid ${restoreMsg.type === 'success' ? '#BBF7D0' : 'var(--danger)'}`,
            borderRadius: '10px',
            fontSize: '13px',
            color: restoreMsg.type === 'success' ? '#15803D' : 'var(--danger)',
            lineHeight: '1.6',
          }}>
            {restoreMsg.type === 'success' ? '✅ ' : '❌ '}{restoreMsg.text}
          </div>
        )}
      </div>

      {/* ── MODAL KONFIRMASI ── */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', marginBottom: '12px' }}>
              Konfirmasi Restore
            </div>
            <div style={{
              fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7',
              marginBottom: '20px', textAlign: 'center',
            }}>
              Seluruh data kamu saat ini — termasuk akun, kategori, target, dan transaksi — akan <strong style={{ color: 'var(--danger)' }}>dihapus permanen</strong> dan diganti dengan data dari file backup ini. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </div>

            {/* Progress */}
            {restoreLoading && restoreProgress && (
              <div style={{
                marginBottom: '16px', padding: '10px 14px',
                background: 'var(--primary-light)',
                borderRadius: '10px',
                fontSize: '13px', color: 'var(--primary)',
                textAlign: 'center',
              }}>
                ⏳ {restoreProgress}
              </div>
            )}

            {/* Checkbox konfirmasi */}
            {!restoreLoading && (
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px',
                background: 'var(--danger-light)',
                borderRadius: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={e => setConfirmChecked(e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--danger)' }}
                />
                <span style={{ fontSize: '12.5px', color: 'var(--danger)', lineHeight: '1.6' }}>
                  Saya mengerti bahwa data yang ada saat ini akan dihapus permanen dan tidak bisa dikembalikan.
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!restoreLoading && (
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    flex: 1, padding: '11px',
                    background: 'var(--bg)', color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px', fontSize: '13px',
                    fontWeight: '500', cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
              )}
              <button
                onClick={handleRestore}
                disabled={!confirmChecked || restoreLoading}
                style={{ ...btnDanger(!confirmChecked || restoreLoading), flex: 1, padding: '11px' }}
              >
                {restoreLoading ? '⏳ Memulihkan...' : '♻️ Ya, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}