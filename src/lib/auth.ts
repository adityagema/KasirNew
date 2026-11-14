import { randomUUID } from "crypto"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ApiError } from "@/lib/api"
import { getSettings } from "@/lib/settings"

export const COOKIE_NAME = "pos_session"

export interface SessionUser {
  id: string
  nama: string
  email: string
  role: string // MANAGEMENT | KASIR
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const settings = await getSettings()
  const jam = Number(settings.SESSION_JAM) || 8
  const expiresAt = new Date(Date.now() + jam * 3600 * 1000)
  const token = randomUUID() + "-" + randomUUID()
  await db.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export async function requireUser(req: NextRequest, roles?: string[]): Promise<SessionUser> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) throw new ApiError("Tidak terautentikasi. Silakan login.", 401)

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {})
    throw new ApiError("Sesi berakhir. Silakan login kembali.", 401)
  }
  if (!session.user.aktif) throw new ApiError("Akun Anda dinonaktifkan.", 403)
  if (roles && !roles.includes(session.user.role)) {
    throw new ApiError("Anda tidak memiliki izin untuk aksi ini.", 403)
  }
  return {
    id: session.user.id,
    nama: session.user.nama,
    email: session.user.email,
    role: session.user.role,
  }
}

export async function logAudit(
  user: SessionUser | null,
  aksi: string,
  detail?: string
): Promise<void> {
  await db.auditLog.create({
    data: { userId: user?.id ?? null, userNama: user?.nama ?? null, aksi, detail: detail ?? null },
  })
}
