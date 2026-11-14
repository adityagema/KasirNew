import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { STATUS_AKTIF } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const body = await req.json()
    const meja = await db.meja.findUnique({ where: { id } })
    if (!meja) throw new ApiError("Meja tidak ditemukan", 404)

    const data: Record<string, unknown> = {}
    if (body?.nama !== undefined) {
      const nama = String(body.nama).trim()
      if (!nama) throw new ApiError("Nama meja wajib diisi")
      data.nama = nama
    }
    if (body?.kapasitas !== undefined) data.kapasitas = Math.max(1, Number(body.kapasitas))
    if (body?.status !== undefined) {
      const s = String(body.status)
      if (!["KOSONG", "TERISI", "RESERVASI"].includes(s)) throw new ApiError("Status meja tidak valid")
      if (s === "KOSONG" && meja.status === "TERISI") {
        const aktif = await db.pesanan.count({ where: { mejaId: id, status: { in: STATUS_AKTIF } } })
        if (aktif > 0) throw new ApiError("Masih ada pesanan aktif di meja ini")
      }
      data.status = s
    }

    const row = await db.meja.update({ where: { id }, data })
    await logAudit(user, "MEJA_UBAH", row.nama)
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const meja = await db.meja.findUnique({ where: { id } })
    if (!meja) throw new ApiError("Meja tidak ditemukan", 404)
    const aktif = await db.pesanan.count({ where: { mejaId: id, status: { in: STATUS_AKTIF } } })
    if (aktif > 0) throw new ApiError("Meja masih memiliki pesanan aktif")
    await db.meja.delete({ where: { id } })
    await logAudit(user, "MEJA_HAPUS", meja.nama)
    return ok({ deleted: true })
  })
}
