'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ENTITY_LABELS = {
    akun: { label: 'Dompet', icon: '👛' },
    kategori: { label: 'Kategori', icon: '🏷️' },
    target: { label: 'Target', icon: '🎯' },
}

const ACTION_LABELS = {
    create: { label: 'Dibuat', color: '#15803D', bg: '#F0FDF4' },
    update: { label: 'Diubah', color: 'var(--primary)', bg: 'var(--primary-light)' },
    delete: { label: 'Dihapus', color: 'var(--danger)', bg: 'var(--danger-light)' },
}

// Map field teknis ke label ramah
const FIELD_LABELS = {
    name: 'Nama',
    type: 'Tipe',
    balance: 'Saldo',
    notes: 'Catatan',
    quota: 'Kuota',
    period: 'Periode',
    warning_pct: 'Peringatan',
    start_date: 'Mulai',
}

// Field yang tidak ditampilkan (teknis/db)
const HIDDEN_FIELDS = ['category_id', 'account_id', 'user_id', 'id', 'color', 'icon']

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const getEntityName = (data) => {
    return data?.name || data?.period || null
}

const renderDiff = (oldData, newData, action) => {
    if (action === 'create' || action === 'delete') return null

    if (action === 'update') {
        const changed = Object.keys(newData || {}).filter(k =>
            !HIDDEN_FIELDS.includes(k) &&
            FIELD_LABELS[k] &&
            String(oldData?.[k]) !== String(newData?.[k])
        )
        if (changed.length === 0) return null
        return (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {changed.map(k => (
                    <div key={k} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12.5px' }}>
                        <span style={{ color: 'var(--text-muted)', minWidth: '60px' }}>{FIELD_LABELS[k]}:</span>
                        <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{String(oldData?.[k])}</span>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <span style={{ color: '#15803D', fontWeight: '500' }}>{String(newData?.[k])}</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function LogPage() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('semua')

    useEffect(() => { fetchLogs() }, [])

    const fetchLogs = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200)
        setLogs(data || [])
        setLoading(false)
    }

    const filtered = logs.filter(log => {
        if (filter === 'semua') return true
        return log.entity_type === filter || log.action === filter
    })



    return (
        <div style={{ maxWidth: '680px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>Log Aktivitas</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Riwayat perubahan konfigurasi akun kamu
                </p>
            </div>

            {/* Filter — 1 baris */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '20px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
            }}>
                <div style={{ display: 'flex', gap: '6px', paddingBottom: '2px' }}>
                    {[
                        { label: 'Semua', val: 'semua', icon: '⚡' },
                        { label: 'Dompet', val: 'akun' },
                        { label: 'Kategori', val: 'kategori' },
                        { label: 'Target', val: 'target' },
                        { label: 'Dibuat', val: 'create' },
                        { label: 'Diubah', val: 'update' },
                        { label: 'Dihapus', val: 'delete' },
                    ].map(({ label, val, icon }) => (
                        <button key={val} onClick={() => setFilter(val)} style={{
                            padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                            cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', flexShrink: 0,
                            borderColor: filter === val ? 'var(--primary)' : 'var(--border)',
                            background: filter === val ? 'var(--primary)' : 'transparent',
                            color: filter === val ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                        }}>{icon ? `${icon} ${label}` : label}</button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    <div style={{ fontSize: '13px' }}>Memuat...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                    <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>Belum ada log</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Perubahan konfigurasi akan muncul di sini</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filtered.map(log => {
                        const entity = ENTITY_LABELS[log.entity_type] || { label: log.entity_type, icon: '📄' }
                        const action = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)', bg: 'var(--bg)' }
                        const entityName = getEntityName(log.new_data || log.old_data)

                        return (
                            <div key={log.id} style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px', padding: '14px 18px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '9px',
                                        background: action.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '17px', flexShrink: 0,
                                    }}>{entity.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text)' }}>
                                                {entity.label}{entityName ? ` — ${entityName}` : ''}
                                            </span>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
                                                color: action.color, background: action.bg,
                                            }}>{action.label}</span>
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {formatDate(log.created_at)}
                                        </div>
                                    </div>
                                </div>
                                {renderDiff(log.old_data, log.new_data, log.action)}
                            </div>
                        )
                    })}
                </div>
            )}

            {filtered.length > 0 && (
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
                    Menampilkan {filtered.length} dari {logs.length} log terakhir
                </div>
            )}
        </div>
    )
}