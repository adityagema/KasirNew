import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    if (!nama) throw new ApiError("Nama kategori wajib diisi")
    const row = await db.kategori.update({ where: { id }, data: { nama } })
    await logAudit(user, "KATEGORI_UBAH", nama)
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const jumlahMenu = await db.menu.count({ where: { kategoriId: id, aktif: true } })
    if (jumlahMenu > 0) {
      throw new ApiError(`Tidak bisa dihapus: masih ada ${jumlahMenu} menu aktif di kategori ini`)
    }
    await db.kategori.update({ where: { id }, data: { aktif: false } })
    await logAudit(user, "KATEGORI_HAPUS", id)
    return ok({ deleted: true })
  })
}
