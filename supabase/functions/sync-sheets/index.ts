import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
const GOOGLE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

// Google Auth
async function getGoogleToken(): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: GOOGLE_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(claim)}`;

  const keyData = GOOGLE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  return data.access_token;
}

// Buat Google Sheet baru
async function createSheet(token: string, email: string): Promise<string> {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title: `Stopboncos - ${email}` },
      sheets: [
        { properties: { title: "Transaksi" } },
        { properties: { title: "Akun" } },
        { properties: { title: "Kategori" } },
        { properties: { title: "Target" } },
      ],
    }),
  });
  const data = await res.json();
  console.log("createSheet response:", JSON.stringify(data))
  return data.spreadsheetId;
}

// Share sheet ke user
async function shareSheet(token: string, sheetId: string, email: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
  });
}

// Tulis data ke sheet
async function writeSheet(token: string, sheetId: string, range: string, values: unknown[][]) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
}

// Sync satu user
async function syncUser(userId: string, email: string, sheetId: string | null, token: string) {
  let sid = sheetId;
  console.log("syncUser start:", email)
  console.log("sheet_id:", sid)
  if (!sid) {
    console.log("Creating new sheet...")
    try {
      sid = await createSheet(token, email)
      console.log("Sheet created:", sid)
    } catch(e) {
      console.log("createSheet error:", String(e))
    }
  }

  

  // Ambil data
  const [{ data: txs }, { data: akuns }, { data: kats }, { data: targets }] = await Promise.all([
    supabase.from("transactions").select("*, accounts(name), categories(name)").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("categories").select("*").eq("user_id", userId),
    supabase.from("targets").select("*, categories(name)").eq("user_id", userId),
  ]);

  // Tulis Transaksi
  const txRows = [
    ["Tanggal", "Keterangan", "Tipe", "Jumlah", "Akun", "Kategori", "Sumber"],
    ...(txs || []).map((t) => [
      t.date, t.description || "", t.type, t.amount,
      t.accounts?.name || "", t.categories?.name || "", t.source || "",
    ]),
  ];
  await writeSheet(token, sid, "Transaksi!A1", txRows);

  // Tulis Akun
  const akunRows = [
    ["Nama", "Tipe", "Saldo", "Catatan"],
    ...(akuns || []).map((a) => [a.name, a.type, a.balance, a.notes || ""]),
  ];
  await writeSheet(token, sid, "Akun!A1", akunRows);

  // Tulis Kategori
  const katRows = [
    ["Nama", "Tipe", "Icon"],
    ...(kats || []).map((k) => [k.name, k.type, k.icon || ""]),
  ];
  await writeSheet(token, sid, "Kategori!A1", katRows);

  // Tulis Target
  const targetRows = [
    ["Kategori", "Kuota", "Periode", "Peringatan %", "Mulai"],
    ...(targets || []).map((t) => [
      t.categories?.name || "", t.quota, t.period, t.warning_pct, t.start_date,
    ]),
  ];
  await writeSheet(token, sid, "Target!A1", targetRows);
}

// Main handler
Deno.serve(async (req) => {
  try {
    console.log("Start function")
    const token = await getGoogleToken();
    console.log("Token acquired")
    console.log("Fetching users...")
    console.log("URL:", Deno.env.get("SUPABASE_URL"))
    console.log("KEY exists:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))

    // Ambil semua user yang belum punya sheet
    const { data: users } = await supabase.from("users").select("id, email, sheet_id").is("sheet_id", null);

    if (!users?.length) {
      return Response.json({ ok: true, message: "Tidak ada user" });
    }

    const results = [];
    for (const user of users) {
      try {
        await syncUser(user.id, user.email, user.sheet_id, token);
        results.push({ email: user.email, status: "ok" });
      } catch (e) {
        results.push({ email: user.email, status: "error", error: String(e) });
      }
    }

    return Response.json({ ok: true, synced: results.length, results });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});