import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { STATUS_AKTIF } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const rows = await db.meja.findMany({ orderBy: { nama: "asc" } })
    // Sertakan pesanan aktif per meja (untuk info di kartu meja)
    const aktif = await db.pesanan.findMany({
      where: { status: { in: STATUS_AKTIF }, mejaId: { not: null } },
      include: { kasir: { select: { nama: true } } },
    })
    const byMeja: Record<string, Array<{ id: string; total: number; tipe: string; status: string; kasir: string; createdAt: Date }>> = {}
    for (const p of aktif) {
      if (!p.mejaId) continue
      byMeja[p.mejaId] = byMeja[p.mejaId] ?? []
      byMeja[p.mejaId].push({
        id: p.id,
        total: p.total,
        tipe: p.tipe,
        status: p.status,
        kasir: p.kasir.nama,
        createdAt: p.createdAt,
      })
    }
    return ok(rows.map((m) => ({ ...m, pesananAktif: byMeja[m.id] ?? [] })))
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    const kapasitas = Number(body?.kapasitas ?? 2)
    if (!nama) throw new ApiError("Nama meja wajib diisi")
    const ada = await db.meja.findUnique({ where: { nama } })
    if (ada) throw new ApiError("Nama meja sudah dipakai")
    const row = await db.meja.create({ data: { nama, kapasitas, status: "KOSONG" } })
    await logAudit(user, "MEJA_TAMBAH", nama)
    return ok(row, 201)
  })
}
