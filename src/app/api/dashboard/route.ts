import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { STATUS_AKTIF, rentangHariJakarta, ymdJakarta } from "@/lib/order-utils"
import { handle, ok } from "@/lib/api"

const Rupiah = (n: number) => n

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    const { mulai, akhir } = rentangHariJakarta()

    if (user.role === "MANAGEMENT") {
      const selesaiHariIni = await db.pesanan.findMany({
        where: { status: "COMPLETED", createdAt: { gte: mulai, lte: akhir } },
        include: { items: true, kasir: { select: { nama: true } } },
      })
      const omzetHariIni = selesaiHariIni.reduce((s, p) => s + p.total, 0)
      const pesananAktif = await db.pesanan.count({ where: { status: { in: STATUS_AKTIF } } })
      const mejaTerisi = await db.meja.count({ where: { status: "TERISI" } })
      const totalMeja = await db.meja.count()
      const totalMenu = await db.menu.count({ where: { aktif: true } })

      // Top 5 menu 30 hari terakhir (pesanan selesai)
      const { mulai: t30, akhir: t30end } = {
        mulai: new Date(Date.now() - 30 * 86400000),
        akhir: new Date(),
      }
      const items30 = await db.pesananItem.findMany({
        where: { pesanan: { status: "COMPLETED", createdAt: { gte: t30, lte: t30end } } },
        select: { namaMenu: true, qty: true, harga: true },
      })
      const mapMenu = new Map<string, { nama: string; qty: number; omzet: number }>()
      for (const it of items30) {
        const prev = mapMenu.get(it.namaMenu) ?? { nama: it.namaMenu, qty: 0, omzet: 0 }
        prev.qty += it.qty
        prev.omzet += it.qty * it.harga
        mapMenu.set(it.namaMenu, prev)
      }
      const top5 = [...mapMenu.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)

      // Grafik omzet 14 hari
      const grafik: Array<{ tanggal: string; omzet: number; transaksi: number }> = []
      for (let i = 13; i >= 0; i--) {
        const { mulai: m, akhir: a } = rentangHariJakarta(-i)
        const rows = await db.pesanan.findMany({
          where: { status: "COMPLETED", createdAt: { gte: m, lte: a } },
          select: { total: true },
        })
        grafik.push({
          tanggal: ymdJakarta(m).slice(8) + "/" + ymdJakarta(m).slice(5, 7),
          omzet: rows.reduce((s, r) => s + r.total, 0),
          transaksi: rows.length,
        })
      }

      const stokMenipis = await db.bahanBaku.findMany({
        where: { aktif: true },
        orderBy: { stok: "asc" },
        take: 6,
      })

      const transaksiTerakhir = await db.pesanan.findMany({
        where: { status: { in: ["COMPLETED", "CANCELLED"] } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { kasir: { select: { nama: true } }, meja: { select: { nama: true } } },
      })

      return ok({
        peran: "MANAGEMENT",
        kartu: {
          omzetHariIni: Rupiah(omzetHariIni),
          transaksiHariIni: selesaiHariIni.length,
          pesananAktif,
          mejaTerisi,
          totalMeja,
          totalMenu,
        },
        top5,
        grafik,
        stokMenipis: stokMenipis.map((b) => ({
          nama: b.nama,
          stok: b.stok,
          satuan: b.satuan,
          minStok: b.minStok,
          menipis: b.stok <= b.minStok,
        })),
        transaksiTerakhir,
      })
    }

    // DASHBOARD KASIR
    const semuaHariIni = await db.pesanan.findMany({
      where: { createdAt: { gte: mulai, lte: akhir }, kasirId: user.id },
      include: { meja: { select: { nama: true } } },
    })
    const selesaiSaya = semuaHariIni.filter((p) => p.status === "COMPLETED")
    const pesananAktif = await db.pesanan.count({ where: { status: { in: STATUS_AKTIF } } })
    const mejaKosong = await db.meja.count({ where: { status: "KOSONG" } })
    const totalMeja = await db.meja.count()
    const pesananTerakhir = await db.pesanan.findMany({
      where: { kasirId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { meja: { select: { nama: true } } },
    })
    const settings = await getSettings()

    return ok({
      peran: "KASIR",
      kartu: {
        transaksiSaya: selesaiSaya.length,
        omzetSaya: selesaiSaya.reduce((s, p) => s + p.total, 0),
        pesananAktif,
        mejaKosong,
        totalMeja,
        pajakPersen: settings.PAJAK_PERSEN,
        servicePersen: settings.SERVICE_PERSEN,
      },
      pesananTerakhir,
    })
  })
}
