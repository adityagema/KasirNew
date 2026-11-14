import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { hitungTotal, bebaskanMejaJikaKosong, STATUS_AKTIF } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

/**
 * POST: gabung beberapa pesanan aktif ke satu pesanan target.
 * Syarat: semua pesanan aktif, sumber belum punya pembayaran.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    const body = await req.json()
    const targetId = String(body?.targetId ?? "")
    const sourceIds: string[] = Array.isArray(body?.sourceIds) ? body.sourceIds.map(String) : []
    if (!targetId) throw new ApiError("Pesanan target wajib dipilih")
    if (sourceIds.length === 0) throw new ApiError("Pilih minimal satu pesanan sumber")
    if (sourceIds.includes(targetId)) throw new ApiError("Pesanan target tidak boleh menjadi sumber")

    const target = await db.pesanan.findUnique({
      where: { id: targetId },
      include: { items: true, pembayarans: true },
    })
    if (!target) throw new ApiError("Pesanan target tidak ditemukan", 404)
    if (!STATUS_AKTIF.includes(target.status)) throw new ApiError("Pesanan target harus masih aktif")

    const sumber = await db.pesanan.findMany({
      where: { id: { in: sourceIds } },
      include: { items: true, pembayarans: true },
    })
    if (sumber.length !== sourceIds.length) throw new ApiError("Ada pesanan sumber yang tidak ditemukan")

    for (const s of sumber) {
      if (!STATUS_AKTIF.includes(s.status)) throw new ApiError(`${s.id} tidak aktif lagi`)
      if (s.pembayarans.length > 0) {
        throw new ApiError(`${s.id} sudah memiliki pembayaran — tidak bisa digabung`)
      }
    }

    // Pindahkan item
    await db.pesananItem.updateMany({
      where: { pesananId: { in: sourceIds } },
      data: { pesananId: targetId },
    })

    // Recompute target
    const itemsTarget = await db.pesananItem.findMany({ where: { pesananId: targetId } })
    const totals = hitungTotal(itemsTarget, target.pajakPersen, target.servicePersen)
    await db.pesanan.update({
      where: { id: targetId },
      data: {
        subtotal: totals.subtotal,
        pajakNominal: totals.pajakNominal,
        serviceNominal: totals.serviceNominal,
        total: totals.total,
      },
    })

    // Tutup pesanan sumber
    for (const s of sumber) {
      await db.pesanan.update({
        where: { id: s.id },
        data: { status: "CANCELLED", catatan: `Digabung ke ${targetId}` },
      })
      if (s.mejaId && s.mejaId !== target.mejaId) {
        await bebaskanMejaJikaKosong(s.mejaId)
      }
    }

    const updated = await db.pesanan.findUnique({
      where: { id: targetId },
      include: { items: true, meja: { select: { nama: true } } },
    })
    await logAudit(user, "PESANAN_GABUNG", `${sourceIds.join(", ")} → ${targetId}`)
    return ok(updated)
  })
}
