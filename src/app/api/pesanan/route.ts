import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import {
  hitungTotal,
  generateNoPesanan,
  validasiMejaKosong,
  STATUS_AKTIF,
} from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

const TIPE = ["DINE_IN", "TAKE_AWAY", "DELIVERY"]

/** GET: daftar pesanan dengan filter */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? ""
    const tipe = searchParams.get("tipe") ?? ""
    const q = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200)

    const where: Record<string, unknown> = {}
    if (status === "AKTIF") where.status = { in: STATUS_AKTIF }
    else if (status) where.status = { in: status.split(",") }
    if (tipe) where.tipe = tipe
    if (q) where.OR = [{ id: { contains: q } }, { namaPelanggan: { contains: q } }]

    const rows = await db.pesanan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        meja: { select: { nama: true } },
        kasir: { select: { nama: true } },
        items: { select: { namaMenu: true, qty: true } },
        pembayarans: { select: { jumlah: true, metode: true } },
      },
    })
    return ok(rows)
  })
}

/** POST: buat pesanan baru dari POS */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    const body = await req.json()
    const tipe = String(body?.tipe ?? "")
    if (!TIPE.includes(tipe)) throw new ApiError("Tipe pesanan tidak valid")

    const rawItems = Array.isArray(body?.items) ? body.items : []
    if (rawItems.length === 0) throw new ApiError("Keranjang masih kosong")

    let meja = null
    if (tipe === "DINE_IN") {
      const mejaId = String(body?.mejaId ?? "")
      if (!mejaId) throw new ApiError("Pesanan DINE IN wajib memilih meja")
      meja = await validasiMejaKosong(mejaId)
    }
    if (tipe === "DELIVERY" && !String(body?.namaPelanggan ?? "").trim()) {
      throw new ApiError("Nama pelanggan wajib diisi untuk pesanan DELIVERY")
    }

    // Ambil harga dari database (jangan percaya klien)
    const ids = rawItems.map((i: { menuId: string }) => String(i.menuId))
    const menus = await db.menu.findMany({ where: { id: { in: ids } } })
    const menuMap = new Map(menus.map((m) => [m.id, m]))

    const itemsData: Array<{ menuId: string; namaMenu: string; harga: number; qty: number; catatan: string | null }> = []
    for (const it of rawItems) {
      const menu = menuMap.get(String(it.menuId))
      if (!menu) throw new ApiError("Ada menu yang tidak ditemukan")
      if (!menu.aktif || !menu.tersedia) {
        throw new ApiError(`Menu "${menu.nama}" sedang tidak tersedia`)
      }
      const qty = Math.max(1, Math.round(Number(it.qty ?? 1)))
      itemsData.push({
        menuId: menu.id,
        namaMenu: menu.nama,
        harga: menu.harga,
        qty,
        catatan: it?.catatan ? String(it.catatan).slice(0, 120) : null,
      })
    }

    const settings = await getSettings()
    const pajakPersen = Number(settings.PAJAK_PERSEN) || 0
    const servicePersen = Number(settings.SERVICE_PERSEN) || 0
    const totals = hitungTotal(itemsData, pajakPersen, servicePersen)
    const id = await generateNoPesanan()

    const pesanan = await db.pesanan.create({
      data: {
        id,
        tipe,
        mejaId: meja?.id ?? null,
        namaPelanggan: body?.namaPelanggan ? String(body.namaPelanggan).trim() : null,
        telepon: body?.telepon ? String(body.telepon).trim() : null,
        alamat: body?.alamat ? String(body.alamat).trim() : null,
        catatan: body?.catatan ? String(body.catatan).trim() : null,
        status: "PENDING",
        kasirId: user.id,
        subtotal: totals.subtotal,
        pajakPersen,
        servicePersen,
        pajakNominal: totals.pajakNominal,
        serviceNominal: totals.serviceNominal,
        total: totals.total,
        items: { create: itemsData },
      },
      include: {
        items: true,
        meja: { select: { nama: true } },
        kasir: { select: { nama: true } },
      },
    })

    if (meja) {
      await db.meja.update({ where: { id: meja.id }, data: { status: "TERISI" } })
    }
    await logAudit(user, "PESANAN_BARU", `${id} (${tipe}) total Rp${totals.total.toLocaleString("id-ID")}`)

    return ok(pesanan, 201)
  })
}
