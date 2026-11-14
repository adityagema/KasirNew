import { db } from "@/lib/db"
import { ApiError } from "@/lib/api"

export const STATUS_AKTIF = ["PENDING", "PREPARING", "READY", "SERVED"]
export const SEMUA_STATUS = [...STATUS_AKTIF, "COMPLETED", "CANCELLED"]

/** Format tanggal menjadi "YYYYMMDD" menurut zona Asia/Jakarta */
export function ymdJakarta(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d) // en-CA => 2026-11-14
}

/** Rentang waktu satu hari kalender Jakarta (mulai - akhir) */
export function rentangHariJakarta(offsetHari = 0): { mulai: Date; akhir: Date } {
  const ymd = ymdJakarta(new Date(Date.now() + offsetHari * 86400000))
  const mulai = new Date(`${ymd}T00:00:00+07:00`)
  const akhir = new Date(`${ymd}T23:59:59.999+07:00`)
  return { mulai, akhir }
}

/** Nomor pesanan unik: ORD-YYYYMMDD-0001 */
export async function generateNoPesanan(): Promise<string> {
  const { mulai, akhir } = rentangHariJakarta()
  for (let attempt = 0; attempt < 5; attempt++) {
    const jumlah = await db.pesanan.count({
      where: { createdAt: { gte: mulai, lte: akhir } },
    })
    const nomor = `ORD-${ymdJakarta()}-${String(jumlah + 1).padStart(4, "0")}`
    const ada = await db.pesanan.findUnique({ where: { id: nomor } })
    if (!ada) return nomor
  }
  return `ORD-${ymdJakarta()}-${Date.now().toString().slice(-4)}`
}

export function hitungTotal(
  items: Array<{ harga: number; qty: number }>,
  pajakPersen: number,
  servicePersen: number
) {
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0)
  const pajakNominal = Math.round((subtotal * pajakPersen) / 100)
  const serviceNominal = Math.round((subtotal * servicePersen) / 100)
  return {
    subtotal,
    pajakNominal,
    serviceNominal,
    total: subtotal + pajakNominal + serviceNominal,
  }
}

/** Perhitungan porsi pajak+service untuk daftar item (split bill per item) */
export function porsiItem(
  itemHarga: number,
  itemQty: number,
  subtotal: number,
  pajakNominal: number,
  serviceNominal: number
) {
  const dasar = itemHarga * itemQty
  if (subtotal <= 0) return dasar
  const pajak = Math.round((dasar / subtotal) * pajakNominal)
  const service = Math.round((dasar / subtotal) * serviceNominal)
  return dasar + pajak + service
}

/** Bebaskan meja jika tidak ada lagi pesanan aktif dine-in pada meja tsb */
export async function bebaskanMejaJikaKosong(mejaId: string | null) {
  if (!mejaId) return
  const aktifLain = await db.pesanan.count({
    where: { mejaId, status: { in: STATUS_AKTIF } },
  })
  if (aktifLain === 0) {
    await db.meja.update({ where: { id: mejaId }, data: { status: "KOSONG" } })
  }
}

/**
 * Kurangi stok bahan baku berdasarkan resep menu pada pesanan.
 * Dipanggil sekali saja (dijaga oleh flag stokDiproses).
 */
export async function prosesStokPesanan(pesananId: string, userId?: string) {
  const pesanan = await db.pesanan.findUnique({
    where: { id: pesananId },
    include: { items: { include: { menu: { include: { resep: { include: { bahan: true } } } } } } },
  })
  if (!pesanan || pesanan.stokDiproses) return false

  const pengurangan = new Map<string, { bahanId: string; qty: number; nama: string }>()
  for (const item of pesanan.items) {
    for (const resep of item.menu.resep) {
      const key = resep.bahanId
      const total = resep.qty * item.qty
      const prev = pengurangan.get(key)
      if (prev) prev.qty += total
      else
        pengurangan.set(key, {
          bahanId: key,
          qty: total,
          nama: resep.bahan.nama,
        })
    }
  }

  for (const [, b] of pengurangan) {
    const bahan = await db.bahanBaku.findUnique({ where: { id: b.bahanId } })
    if (!bahan) continue
    const stokSesudah = bahan.stok - b.qty
    await db.bahanBaku.update({
      where: { id: b.bahanId },
      data: { stok: stokSesudah },
    })
    await db.mutasiStok.create({
      data: {
        bahanId: b.bahanId,
        tipe: "OTOMATIS",
        qty: b.qty,
        stokSesudah,
        keterangan: `Auto: pesanan ${pesanan.id}${stokSesudah < 0 ? " (stok minus!)" : ""}`,
        refId: pesanan.id,
        userId: userId ?? null,
      },
    })
  }

  await db.pesanan.update({
    where: { id: pesananId },
    data: { stokDiproses: true },
  })
  return true
}

/** Validasi & ambil meja kosong untuk DINE IN */
export async function validasiMejaKosong(mejaId: string) {
  const meja = await db.meja.findUnique({ where: { id: mejaId } })
  if (!meja) throw new ApiError("Meja tidak ditemukan", 404)
  const aktif = await db.pesanan.count({
    where: { mejaId, status: { in: STATUS_AKTIF } },
  })
  if (aktif > 0) {
    throw new ApiError(`${meja.nama} sedang terisi pesanan aktif. Pilih meja lain.`, 409)
  }
  return meja
}
