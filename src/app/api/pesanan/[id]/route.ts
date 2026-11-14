import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { hitungTotal } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: P) {
  return handle(async () => {
    await requireUser(req)
    const { id } = await params
    const pesanan = await db.pesanan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        pembayarans: { orderBy: { createdAt: "asc" } },
        meja: { select: { nama: true } },
        kasir: { select: { nama: true } },
      },
    })
    if (!pesanan) throw new ApiError("Pesanan tidak ditemukan", 404)
    const settings = await getSettings()
    return ok({ ...pesanan, settings })
  })
}

/** PUT: ubah item pesanan (hanya saat status PENDING) */
export async function PUT(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req)
    const { id } = await params
    const body = await req.json()
    const pesanan = await db.pesanan.findUnique({ where: { id } })
    if (!pesanan) throw new ApiError("Pesanan tidak ditemukan", 404)
    if (pesanan.status !== "PENDING") {
      throw new ApiError("Pesanan hanya bisa diubah saat status masih PENDING")
    }
    const sudahBayar = await db.pembayaran.count({ where: { pesananId: id } })
    if (sudahBayar > 0) {
      throw new ApiError("Pesanan sudah memiliki pembayaran, tidak bisa diubah")
    }

    const rawItems = Array.isArray(body?.items) ? body.items : []
    if (rawItems.length === 0) throw new ApiError("Daftar item tidak boleh kosong")

    const ids = rawItems.map((i: { menuId: string }) => String(i.menuId))
    const menus = await db.menu.findMany({ where: { id: { in: ids } } })
    const menuMap = new Map(menus.map((m) => [m.id, m]))

    const itemsData: Array<{ menuId: string; namaMenu: string; harga: number; qty: number; catatan: string | null }> = []
    for (const it of rawItems) {
      const menu = menuMap.get(String(it.menuId))
      if (!menu) throw new ApiError("Ada menu yang tidak ditemukan")
      itemsData.push({
        menuId: menu.id,
        namaMenu: menu.nama,
        harga: menu.harga,
        qty: Math.max(1, Math.round(Number(it.qty ?? 1))),
        catatan: it?.catatan ? String(it.catatan).slice(0, 120) : null,
      })
    }

    const settings = await getSettings()
    const totals = hitungTotal(itemsData, Number(settings.PAJAK_PERSEN) || 0, Number(settings.SERVICE_PERSEN) || 0)

    await db.pesananItem.deleteMany({ where: { pesananId: id, bayarId: null } })
    await db.pesananItem.createMany({ data: itemsData.map((i) => ({ ...i, pesananId: id })) })

    const updated = await db.pesanan.update({
      where: { id },
      data: {
        subtotal: totals.subtotal,
        pajakNominal: totals.pajakNominal,
        serviceNominal: totals.serviceNominal,
        total: totals.total,
        catatan: body?.catatan !== undefined ? String(body.catatan ?? "").trim() : undefined,
      },
      include: { items: true },
    })
    await logAudit(user, "PESANAN_UBAH", `${id} total baru Rp${totals.total.toLocaleString("id-ID")}`)
    return ok(updated)
  })
}
