import { db } from "@/lib/db"

export interface Settings {
  NAMA_RESTORAN: string
  ALAMAT: string
  TELEPON: string
  PAJAK_PERSEN: string
  SERVICE_PERSEN: string
  STRUK_UKURAN: string // "58" | "80"
  STOK_REDUCE_ON: string // PAYMENT | KIRIM
  SESSION_JAM: string
  FOOTER_STRUK: string
}

const DEFAULTS: Settings = {
  NAMA_RESTORAN: "Restoran Nusantara",
  ALAMAT: "Jl. Merdeka No. 123, Jakarta",
  TELEPON: "021-555-0123",
  PAJAK_PERSEN: "10",
  SERVICE_PERSEN: "5",
  STRUK_UKURAN: "80",
  STOK_REDUCE_ON: "PAYMENT",
  SESSION_JAM: "8",
  FOOTER_STRUK: "Terima kasih atas kunjungan Anda!",
}

const ALLOWED_KEYS = Object.keys(DEFAULTS)

export async function getSettings(): Promise<Settings> {
  const rows = await db.pengaturan.findMany()
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { ...DEFAULTS, ...map } as Settings
}

export async function saveSettings(partial: Record<string, string>): Promise<Settings> {
  for (const [key, value] of Object.entries(partial)) {
    if (!ALLOWED_KEYS.includes(key)) continue
    await db.pengaturan.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  return getSettings()
}
