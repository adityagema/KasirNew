import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { ymdJakarta } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

/**
 * GET ?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
 * Laporan penjualan (pesanan COMPLETED saja; BATAL tidak dihitung).
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const { searchParams } = new URL(req.url)
    const dariStr = searchParams.get("dari") || ymdJakarta()
    const sampaiStr = searchParams.get("sampai") || ymdJakarta()

    const dari = new Date(`${dariStr}T00:00:00+07:00`)
    const sampai = new Date(`${sampaiStr}T23:59:59.999+07:00`)
    if (isNaN(dari.getTime()) || isNaN(sampai.getTime())) {
      throw new ApiError("Format tanggal tidak valid (YYYY-MM-DD)")
    }

    const pesanan = await db.pesanan.findMany({
      where: { status: "COMPLETED", createdAt: { gte: dari, lte: sampai } },
      include: {
        items: { include: { menu: { include: { kategori: { select: { nama: true } } } } } },
        pembayarans: true,
        meja: { select: { nama: true } },
        kasir: { select: { nama: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const omzet = pesanan.reduce((s, p) => s + p.total, 0)
    const totalPajak = pesanan.reduce((s, p) => s + p.pajakNominal, 0)
    const totalService = pesanan.reduce((s, p) => s + p.serviceNominal, 0)

    // Per metode pembayaran (dari tabel pembayaran)
    const perMetode: Record<string, { jumlah: number; nominal: number }> = {}
    for (const p of pesanan) {
      for (const b of p.pembayarans) {
        const m = perMetode[b.metode] ?? { jumlah: 0, nominal: 0 }
        m.jumlah += 1
        m.nominal += b.jumlah
        perMetode[b.metode] = m
      }
    }

    // Per tipe pesanan
    const perTipe: Record<string, { jumlah: number; nominal: number }> = {}
    for (const p of pesanan) {
      const t = perTipe[p.tipe] ?? { jumlah: 0, nominal: 0 }
      t.jumlah += 1
      t.nominal += p.total
      perTipe[p.tipe] = t
    }

    // Per kategori & top menu
    const perKategori: Record<string, { qty: number; nominal: number }> = {}
    const perMenu = new Map<string, { nama: string; qty: number; nominal: number }>()
    for (const p of pesanan) {
      for (const it of p.items) {
        const kat = it.menu.kategori.nama
        const k = perKategori[kat] ?? { qty: 0, nominal: 0 }
        k.qty += it.qty
        k.nominal += it.qty * it.harga
        perKategori[kat] = k
        const m = perMenu.get(it.namaMenu) ?? { nama: it.namaMenu, qty: 0, nominal: 0 }
        m.qty += it.qty
        m.nominal += it.qty * it.harga
        perMenu.set(it.namaMenu, m)
      }
    }
    const topMenu = [...perMenu.values()].sort((a, b) => b.qty - a.qty)

    // Grafik per hari
    const perHari = new Map<string, { tanggal: string; omzet: number; transaksi: number }>()
    for (const p of pesanan) {
      const ymd = ymdJakarta(p.createdAt)
      const h = perHari.get(ymd) ?? { tanggal: ymd, omzet: 0, transaksi: 0 }
      h.omzet += p.total
      h.transaksi += 1
      perHari.set(ymd, h)
    }

    const rinci = pesanan.map((p) => ({
      id: p.id,
      tanggal: p.createdAt,
      tipe: p.tipe,
      meja: p.meja?.nama ?? null,
      kasir: p.kasir.nama,
      subtotal: p.subtotal,
      pajak: p.pajakNominal,
      service: p.serviceNominal,
      total: p.total,
      metode: p.pembayarans.map((b) => b.metode).join("+"),
      jumlahItem: p.items.reduce((s, i) => s + i.qty, 0),
    }))

    return ok({
      periode: { dari: dariStr, sampai: sampaiStr },
      ringkasan: {
        omzet,
        transaksi: pesanan.length,
        rataRata: pesanan.length ? Math.round(omzet / pesanan.length) : 0,
        totalPajak,
        totalService,
      },
      perMetode,
      perTipe,
      perKategori,
      topMenu,
      grafik: [...perHari.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
      rinci,
    })
  })
}
