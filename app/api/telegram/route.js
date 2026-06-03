import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export async function POST(req) {
  const body = await req.json()
  const message = body?.message
  if (!message) return Response.json({ ok: true })

  const chatId = message.chat.id
  const text = message.text || ''
  const parts = text.trim().split(/\s+/)
  const command = parts[0]?.toLowerCase()

  // Cek user terhubung
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_chat_id', String(chatId))
    .single()

  // Command /link
  if (command === '/link') {
    const kode = parts[1]
    if (!kode) {
      await sendMessage(chatId, '❌ Format: /link KODE_UNIK\n\nDapatkan kode di halaman Profil Stopboncos.')
      return Response.json({ ok: true })
    }

    console.log('Mencari kode:', kode)
    const { data: linkData, error: linkError } = await supabase
      .from('telegram_link_codes')
      .select('*')
      .eq('code', kode)
      .single()
    console.log('linkData:', JSON.stringify(linkData))
    console.log('linkError:', JSON.stringify(linkError))

    if (!linkData) {
      await sendMessage(chatId, '❌ Kode tidak valid atau sudah expired. Buat kode baru di halaman Profil.')
      return Response.json({ ok: true })
    }

    await supabase.from('users').update({ telegram_chat_id: String(chatId) }).eq('id', linkData.user_id)
    await supabase.from('telegram_link_codes').delete().eq('code', kode)

    await sendMessage(chatId, '✅ Akun berhasil terhubung ke Stopboncos!\n\nKetik /help untuk melihat perintah yang tersedia.')
    return Response.json({ ok: true })
  }

  // Semua command lain butuh akun terhubung
  if (!userData) {
    await sendMessage(chatId, '⚠️ Akun belum terhubung.\n\n1. Buka Stopboncos\n2. Masuk ke halaman Profil\n3. Generate kode unik\n4. Kirim /link KODE ke bot ini')
    return Response.json({ ok: true })
  }

  // Command /help
  if (command === '/help') {
    await sendMessage(chatId, `🤖 <b>Stopboncos Bot</b>\n\nPerintah yang tersedia:\n\n💸 <b>Catat pengeluaran:</b>\n/tx 25000 makan siang\n\n📈 <b>Catat pemasukan:</b>\n/in 2000000 gaji april\n\n💰 <b>Cek saldo:</b>\n/saldo\n\n📋 <b>Ringkasan bulan ini:</b>\n/laporan\n\n🎯 <b>Status target:</b>\n/target`)
    return Response.json({ ok: true })
  }

  // Command /saldo
  if (command === '/saldo') {
    const { data: akuns } = await supabase.from('accounts').select('*').eq('user_id', userData.id)
    if (!akuns?.length) {
      await sendMessage(chatId, '💰 Belum ada akun. Tambah akun di Stopboncos.')
      return Response.json({ ok: true })
    }
    const total = akuns.reduce((s, a) => s + a.balance, 0)
    const list = akuns.map(a => `• ${a.name}: ${fmt(a.balance)}`).join('\n')
    await sendMessage(chatId, `💰 <b>Saldo Akun</b>\n\n${list}\n\n<b>Total: ${fmt(total)}</b>`)
    return Response.json({ ok: true })
  }

  // Command /laporan
  if (command === '/laporan') {
    const now = new Date()
    const bulanStr = String(now.getMonth() + 1).padStart(2, '0')
    const tahun = now.getFullYear()
    const { data: txs } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', userData.id)
      .gte('date', `${tahun}-${bulanStr}-01`)
      .lte('date', `${tahun}-${bulanStr}-31`)

    const masuk = txs?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0
    const keluar = txs?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0
    await sendMessage(chatId, `📋 <b>Laporan ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</b>\n\n📈 Masuk: ${fmt(masuk)}\n📉 Keluar: ${fmt(keluar)}\n💰 Sisa: ${fmt(masuk - keluar)}`)
    return Response.json({ ok: true })
  }

  // Command /target
  if (command === '/target') {
    const now = new Date()
    const bulanStr = String(now.getMonth() + 1).padStart(2, '0')
    const tahun = now.getFullYear()
    const { data: targets } = await supabase.from('targets')
      .select('*, categories(name, icon)')
      .eq('user_id', userData.id)
    const { data: txs } = await supabase.from('transactions')
      .select('*').eq('user_id', userData.id).eq('type', 'expense')
      .gte('date', `${tahun}-${bulanStr}-01`).lte('date', `${tahun}-${bulanStr}-31`)

    if (!targets?.length) {
      await sendMessage(chatId, '🎯 Belum ada target. Buat target di Stopboncos.')
      return Response.json({ ok: true })
    }

    const list = targets.map(t => {
      const spent = txs?.filter(tx => tx.category_id === t.category_id).reduce((s, tx) => s + tx.amount, 0) || 0
      const pct = Math.round(spent / t.quota * 100)
      const status = pct >= 100 ? '🔴' : pct >= t.warning_pct ? '🟡' : '🟢'
      return `${status} ${t.categories?.icon || ''} ${t.categories?.name}: ${fmt(spent)} / ${fmt(t.quota)} (${pct}%)`
    }).join('\n')

    await sendMessage(chatId, `🎯 <b>Status Target Bulan Ini</b>\n\n${list}`)
    return Response.json({ ok: true })
  }

  // Command /tx — catat pengeluaran
  if (command === '/tx') {
    const amount = parseFloat(parts[1])
    const desc = parts.slice(2).join(' ')
    if (!amount || isNaN(amount)) {
      await sendMessage(chatId, '❌ Format: /tx NOMINAL keterangan\nContoh: /tx 25000 makan siang')
      return Response.json({ ok: true })
    }

    const { data: akuns } = await supabase.from('accounts').select('*').eq('user_id', userData.id)
    const akun = akuns?.[0]
    if (!akun) {
      await sendMessage(chatId, '❌ Belum ada akun. Tambah akun di Stopboncos dulu.')
      return Response.json({ ok: true })
    }

    await supabase.from('transactions').insert({
      user_id: userData.id,
      type: 'expense',
      amount,
      account_id: akun.id,
      description: desc || 'Via Telegram',
      date: new Date().toISOString().slice(0, 10),
      source: 'telegram',
    })

    await supabase.from('accounts').update({ balance: akun.balance - amount }).eq('id', akun.id)
    await sendMessage(chatId, `✅ <b>Pengeluaran dicatat!</b>\n\n💸 ${fmt(amount)}\n📝 ${desc || 'Via Telegram'}\n🏦 ${akun.name}\n💰 Sisa saldo: ${fmt(akun.balance - amount)}`)
    return Response.json({ ok: true })
  }

  // Command /in — catat pemasukan
  if (command === '/in') {
    const amount = parseFloat(parts[1])
    const desc = parts.slice(2).join(' ')
    if (!amount || isNaN(amount)) {
      await sendMessage(chatId, '❌ Format: /in NOMINAL keterangan\nContoh: /in 2000000 gaji april')
      return Response.json({ ok: true })
    }

    const { data: akuns } = await supabase.from('accounts').select('*').eq('user_id', userData.id)
    const akun = akuns?.[0]
    if (!akun) {
      await sendMessage(chatId, '❌ Belum ada akun. Tambah akun di Stopboncos dulu.')
      return Response.json({ ok: true })
    }

    await supabase.from('transactions').insert({
      user_id: userData.id,
      type: 'income',
      amount,
      account_id: akun.id,
      description: desc || 'Via Telegram',
      date: new Date().toISOString().slice(0, 10),
      source: 'telegram',
    })

    await supabase.from('accounts').update({ balance: akun.balance + amount }).eq('id', akun.id)
    await sendMessage(chatId, `✅ <b>Pemasukan dicatat!</b>\n\n📈 ${fmt(amount)}\n📝 ${desc || 'Via Telegram'}\n🏦 ${akun.name}\n💰 Saldo baru: ${fmt(akun.balance + amount)}`)
    return Response.json({ ok: true })
  }

  // Default
  await sendMessage(chatId, '❓ Perintah tidak dikenali. Ketik /help untuk melihat perintah yang tersedia.')
  return Response.json({ ok: true })
}