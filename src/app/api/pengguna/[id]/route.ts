import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const body = await req.json()
    const target = await db.user.findUnique({ where: { id }, include: { sessions: true } })
    if (!target) throw new ApiError("Pengguna tidak ditemukan", 404)

    const data: Record<string, unknown> = {}
    let paksaLogout = false
    let aksi = "PENGGUNA_UBAH"

    if (body?.nama !== undefined) data.nama = String(body.nama).trim()
    if (body?.role !== undefined) {
      const role = String(body.role)
      if (!["MANAGEMENT", "KASIR"].includes(role)) throw new ApiError("Peran tidak valid")
      data.role = role
      if (id === user.id && role !== "MANAGEMENT") {
        throw new ApiError("Tidak bisa menurunkan peran akun sendiri")
      }
    }
    if (typeof body?.aktif === "boolean") {
      data.aktif = body.aktif
      if (!body.aktif) paksaLogout = true
      aksi = body.aktif ? "PENGGUNA_AKTIFKAN" : "PENGGUNA_NONAKTIFKAN"
    }
    if (body?.passwordBaru) {
      const pw = String(body.passwordBaru)
      if (pw.length < 6) throw new ApiError("Password minimal 6 karakter")
      data.passwordHash = hashPassword(pw)
      paksaLogout = true
      aksi = "PENGGUNA_RESET_PASSWORD"
    }

    if (paksaLogout) {
      await db.session.deleteMany({ where: { userId: id } })
    }

    const row = await db.user.update({
      where: { id },
      data,
      select: { id: true, nama: true, email: true, role: true, aktif: true, createdAt: true },
    })
    await logAudit(user, aksi, `${target.email}`)
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    if (id === user.id) throw new ApiError("Tidak bisa menghapus akun sendiri")
    const target = await db.user.findUnique({ where: { id } })
    if (!target) throw new ApiError("Pengguna tidak ditemukan", 404)
    const punyaPesanan = await db.pesanan.count({ where: { kasirId: id } })
    if (punyaPesanan > 0) {
      // nonaktifkan saja agar riwayat pesanan tetap utuh
      await db.user.update({ where: { id }, data: { aktif: false } })
      await db.session.deleteMany({ where: { userId: id } })
      await logAudit(user, "PENGGUNA_NONAKTIFKAN", `${target.email} (punya riwayat pesanan)`)
      return ok({ deleted: false, deactivated: true })
    }
    await db.user.delete({ where: { id } })
    await logAudit(user, "PENGGUNA_HAPUS", target.email)
    return ok({ deleted: true })
  })
}
