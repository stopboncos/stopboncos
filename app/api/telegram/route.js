import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendMessage(chatId, text, keyboard = null, removeKeyboard = false) {
  const payload = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (keyboard) {
    payload.reply_markup = {
      keyboard,
      one_time_keyboard: true,
      resize_keyboard: true
    }
  }
  if (removeKeyboard) {
    payload.reply_markup = { remove_keyboard: true }
  }
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function parseDate(str) {
  if (!str) return new Date().toISOString().slice(0, 10)
  const parts = str.split('/')
  if (parts.length !== 3) return new Date().toISOString().slice(0, 10)
  const [d, m, y] = parts
  const year = y.length === 2 ? '20' + y : y
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

async function getSession(chatId) {
  const { data } = await supabase
    .from('telegram_sessions')
    .select('state')
    .eq('chat_id', String(chatId))
    .single()
  return data?.state || null
}

async function setSession(chatId, state) {
  await supabase.from('telegram_sessions').upsert({
    chat_id: String(chatId),
    state,
    updated_at: new Date().toISOString()
  }, { onConflict: 'chat_id' })
}

async function clearSession(chatId) {
  await supabase.from('telegram_sessions').delete().eq('chat_id', String(chatId))
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch(e) {
    return Response.json({ ok: true })
  }

  const message = body?.message
  if (!message) return Response.json({ ok: true })

  const chatId = message.chat.id
  const text = (message.text || '').trim()

  // Cek user terhubung
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_chat_id', String(chatId))
    .single()

  // Command /link
  if (text.startsWith('/link')) {
    const kode = text.split(/\s+/)[1]
    if (!kode) {
      await sendMessage(chatId, '❌ Format: /link KODE_UNIK\n\nDapatkan kode di halaman Profil Stopboncos.')
      return Response.json({ ok: true })
    }

    const { data: linkData } = await supabase
      .from('telegram_link_codes')
      .select('*')
      .eq('code', kode)
      .single()

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

  // ===== CEK SESSION AKTIF =====
  const session = await getSession(chatId)

  if (session) {
    // /batal saat session aktif
    if (text === '/batal') {
      await clearSession(chatId)
      await sendMessage(chatId, '❌ Input dibatalkan.', null, true)
      return Response.json({ ok: true })
    }

    // Step: pilih kategori
    if (session.step === 'pilih_kategori') {
      const katId = session.kategoriMap?.[text.trim()]
      const kat = session.kategori.find(k => k.id === katId)
      if (!kat) {
        await sendMessage(chatId, '❌ Pilihan tidak valid. Ketik nama kategori yang tersedia.')
        return Response.json({ ok: true })
      }

      const { data: akuns } = await supabase.from('accounts').select('*').eq('user_id', userData.id)
      if (!akuns?.length) {
        await clearSession(chatId)
        await sendMessage(chatId, '❌ Belum ada dompet. Tambah dompet di Stopboncos dulu.', null, true)
        return Response.json({ ok: true })
      }

      const akunMap = {}
      const akunKeyboard = akuns.map(a => {
        const label = `${a.name} (${fmt(a.balance)})`
        akunMap[label] = a.id
        return [{ text: label }]
      })

      await setSession(chatId, { ...session, step: 'pilih_dompet', category_id: kat.id, category_name: kat.name, akuns, akunMap })
      await sendMessage(chatId, '💰 Pilih dompet:', akunKeyboard)
      return Response.json({ ok: true })
    }

    // Step: pilih dompet
    if (session.step === 'pilih_dompet') {
      const akunId = session.akunMap?.[text.trim()]
      const akun = session.akuns.find(a => a.id === akunId)
      if (!akun) {
        await sendMessage(chatId, '❌ Pilihan tidak valid. Ketik nama dompet yang tersedia.')
        return Response.json({ ok: true })
      }

      await supabase.from('transactions').insert({
        user_id: userData.id,
        type: session.type,
        amount: session.amount,
        account_id: akun.id,
        category_id: session.category_id,
        description: session.description,
        date: session.date,
        source: 'telegram',
      })

      const newBalance = session.type === 'income'
        ? akun.balance + session.amount
        : akun.balance - session.amount
      await supabase.from('accounts').update({ balance: newBalance }).eq('id', akun.id)
      await clearSession(chatId)

      const emoji = session.type === 'income' ? '📈' : '📉'
      const sign = session.type === 'income' ? '+' : '-'
      await sendMessage(
        chatId,
        `✅ <b>Transaksi tersimpan!</b>\n\n${emoji} ${sign}${fmt(session.amount)}\n📝 ${session.description}\n🏷️ ${session.category_name}\n💰 ${akun.name}\n📅 ${session.date}\n\nSisa saldo ${akun.name}: ${fmt(newBalance)}`,
        null, true
      )
      return Response.json({ ok: true })
    }
  }

  // ===== COMMAND BARU =====
  const parts = text.split(/\s+/)
  const command = parts[0].toLowerCase()

  // OUT / IN
  if (command === 'out' || command === 'in') {
    const type = command === 'out' ? 'expense' : 'income'
    const amount = parseFloat(parts[1])

    if (!amount || isNaN(amount)) {
      await sendMessage(chatId, `❌ Format: ${command} NOMINAL keterangan\nContoh: ${command} 25000 bakso\nContoh: ${command} 25000 bakso 24/06/26`)
      return Response.json({ ok: true })
    }

    const lastPart = parts[parts.length - 1]
    const isDate = /^\d{2}\/\d{2}\/\d{2,4}$/.test(lastPart)
    const date = isDate ? parseDate(lastPart) : new Date().toISOString().slice(0, 10)
    const descParts = isDate ? parts.slice(2, -1) : parts.slice(2)
    const description = descParts.join(' ') || (type === 'expense' ? 'Pengeluaran' : 'Pemasukan')

    const katType = type === 'expense' ? 'expense' : 'income'
    const { data: kategori } = await supabase
      .from('categories').select('*').eq('user_id', userData.id).eq('type', katType)

    if (!kategori?.length) {
      await sendMessage(chatId, `❌ Belum ada kategori. Tambah di Stopboncos dulu.`)
      return Response.json({ ok: true })
    }

    const kategoriMap = {}
    const keyboard = kategori.map(k => {
      const label = `${k.icon || ''} ${k.name}`.trim()
      kategoriMap[label] = k.id
      return [{ text: label }]
    })

    await setSession(chatId, { step: 'pilih_kategori', type, amount, description, date, kategori, kategoriMap })
    await sendMessage(chatId, '🏷️ Pilih kategori:', keyboard)
    return Response.json({ ok: true })
  }

  // /help
  if (command === '/help' || command === 'help') {
    await sendMessage(chatId, `🤖 <b>Stopboncos Bot</b>\n\nPerintah:\n\n📉 <b>Catat pengeluaran:</b>\nout 25000 bakso\nout 25000 bakso 24/06/26\n\n📈 <b>Catat pemasukan:</b>\nin 2000000 gaji\nin 2000000 gaji 01/06/26\n\n💰 <b>Cek saldo:</b>\n/saldo\n\n📋 <b>Laporan bulan ini:</b>\n/laporan\n\n🎯 <b>Status target:</b>\n/target\n\n❌ <b>Batal input:</b>\n/batal`)
    return Response.json({ ok: true })
  }

  // /saldo
  if (command === '/saldo') {
    const { data: akuns } = await supabase.from('accounts').select('*').eq('user_id', userData.id)
    if (!akuns?.length) {
      await sendMessage(chatId, '💰 Belum ada dompet. Tambah dompet di Stopboncos.')
      return Response.json({ ok: true })
    }
    const total = akuns.reduce((s, a) => s + a.balance, 0)
    const list = akuns.map(a => `• ${a.name}: ${fmt(a.balance)}`).join('\n')
    await sendMessage(chatId, `💰 <b>Saldo Dompet</b>\n\n${list}\n\n<b>Total: ${fmt(total)}</b>`)
    return Response.json({ ok: true })
  }

  // /laporan
  if (command === '/laporan') {
    const now = new Date()
    const bulanStr = String(now.getMonth() + 1).padStart(2, '0')
    const tahun = now.getFullYear()
    const { data: txs } = await supabase.from('transactions')
      .select('*').eq('user_id', userData.id)
      .gte('date', `${tahun}-${bulanStr}-01`)
      .lte('date', `${tahun}-${bulanStr}-31`)
    const masuk = txs?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0
    const keluar = txs?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0
    await sendMessage(chatId, `📋 <b>Laporan ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</b>\n\n📈 Masuk: ${fmt(masuk)}\n📉 Keluar: ${fmt(keluar)}\n💰 Sisa: ${fmt(masuk - keluar)}`)
    return Response.json({ ok: true })
  }

  // /target
  if (command === '/target') {
    const now = new Date()
    const bulanStr = String(now.getMonth() + 1).padStart(2, '0')
    const tahun = now.getFullYear()
    const { data: targets } = await supabase.from('targets')
      .select('*, categories(name, icon)').eq('user_id', userData.id)
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

  // /batal
  if (command === '/batal') {
    await clearSession(chatId)
    await sendMessage(chatId, '❌ Input dibatalkan.', null, true)
    return Response.json({ ok: true })
  }

  await sendMessage(chatId, '❓ Perintah tidak dikenali. Ketik /help untuk melihat perintah.')
  return Response.json({ ok: true })
}