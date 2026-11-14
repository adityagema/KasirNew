import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { createSession, logAudit, COOKIE_NAME } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? "").trim().toLowerCase()
    const password = String(body?.password ?? "")
    if (!email || !password) throw new ApiError("Email dan password wajib diisi")

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError("Email atau password salah", 401)
    }
    if (!user.aktif) throw new ApiError("Akun Anda dinonaktifkan. Hubungi manajemen.", 403)

    const { token, expiresAt } = await createSession(user.id)
    await logAudit(
      { id: user.id, nama: user.nama, email: user.email, role: user.role },
      "LOGIN",
      `${user.email} berhasil login`
    )

    const res = NextResponse.json({
      success: true,
      data: { id: user.id, nama: user.nama, email: user.email, role: user.role },
    })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    })
    return res
  })
}
