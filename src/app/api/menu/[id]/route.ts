import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req)
    const { id } = await params
    const body = await req.json()
    const menu = await db.menu.findUnique({ where: { id } })
    if (!menu) throw new ApiError("Menu tidak ditemukan", 404)

    // Kasir hanya boleh ganti status tersedia (sold out)
    if (user.role === "KASIR") {
      if (typeof body?.tersedia !== "boolean") {
        throw new ApiError("Kasir hanya boleh mengubah status tersedia/sold out", 403)
      }
      const row = await db.menu.update({ where: { id }, data: { tersedia: body.tersedia } })
      await logAudit(user, "MENU_TERSEDIA", `${menu.kode} tersedia=${body.tersedia}`)
      return ok(row)
    }

    const data: Record<string, unknown> = {}
    if (body?.nama !== undefined) data.nama = String(body.nama).trim()
    if (body?.kategoriId !== undefined) data.kategoriId = String(body.kategoriId)
    if (body?.harga !== undefined) {
      const harga = Number(body.harga)
      if (!harga || harga <= 0) throw new ApiError("Harga harus lebih dari 0")
      data.harga = Math.round(harga)
    }
    if (body?.deskripsi !== undefined) data.deskripsi = body.deskripsi ? String(body.deskripsi) : null
    if (body?.foto !== undefined) data.foto = body.foto ? String(body.foto) : null
    if (typeof body?.tersedia === "boolean") data.tersedia = body.tersedia
    if (typeof body?.aktif === "boolean") data.aktif = body.aktif

    const row = await db.menu.update({ where: { id }, data })
    await logAudit(user, "MENU_UBAH", `${menu.kode} ${row.nama}`)
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    // Soft delete: tidak muncul lagi di POS & daftar
    const row = await db.menu.update({ where: { id }, data: { aktif: false, tersedia: false } })
    await logAudit(user, "MENU_HAPUS", row.kode)
    return ok({ deleted: true })
  })
}
