import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const rows = await db.kategori.findMany({
      where: { aktif: true },
      orderBy: { urutan: "asc" },
      include: { _count: { select: { menus: { where: { aktif: true } } } } },
    })
    return ok(rows)
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    if (!nama) throw new ApiError("Nama kategori wajib diisi")
    const ada = await db.kategori.findUnique({ where: { nama } })
    if (ada) throw new ApiError("Kategori dengan nama tersebut sudah ada")
    const maxUrutan = await db.kategori.aggregate({ _max: { urutan: true } })
    const row = await db.kategori.create({
      data: { nama, urutan: (maxUrutan._max.urutan ?? 0) + 1 },
    })
    await logAudit(user, "KATEGORI_TAMBAH", nama)
    return ok(row, 201)
  })
}
