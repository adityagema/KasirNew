import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { ApiError, handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req, ["MANAGEMENT"])
    const rows = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, nama: true, email: true, role: true, aktif: true,
        createdAt: true, _count: { select: { sessions: true } },
      },
    })
    return ok(rows.map(({ _count, ...r }) => ({ ...r, sesiAktif: _count.sessions })))
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const password = String(body?.password ?? "")
    const role = String(body?.role ?? "")
    if (!nama || !email || !password) throw new ApiError("Nama, email, dan password wajib diisi")
    if (password.length < 6) throw new ApiError("Password minimal 6 karakter")
    if (!["MANAGEMENT", "KASIR"].includes(role)) throw new ApiError("Peran harus MANAGEMENT atau KASIR")
    const ada = await db.user.findUnique({ where: { email } })
    if (ada) throw new ApiError("Email sudah terdaftar")

    const row = await db.user.create({
      data: { nama, email, passwordHash: hashPassword(password), role, aktif: true },
      select: { id: true, nama: true, email: true, role: true, aktif: true, createdAt: true },
    })
    await logAudit(user, "PENGGUNA_TAMBAH", `${email} (${role})`)
    return ok(row, 201)
  })
}
