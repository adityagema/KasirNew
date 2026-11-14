import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

/** GET ?menuId= : resep satu menu (dengan info bahan) */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    if (user.role !== "MANAGEMENT") throw new ApiError("Hanya manajemen dapat melihat resep", 403)
    const { searchParams } = new URL(req.url)
    const menuId = searchParams.get("menuId") ?? ""
    if (!menuId) throw new ApiError("menuId wajib diisi")
    const rows = await db.resep.findMany({
      where: { menuId },
      include: { bahan: { select: { id: true, nama: true, satuan: true, stok: true } } },
    })
    return ok(rows)
  })
}

/** PUT: simpan resep menu (replace all) */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const menuId = String(body?.menuId ?? "")
    const rows: Array<{ bahanId: string; qty: number }> = Array.isArray(body?.resep) ? body.resep : []

    const menu = await db.menu.findUnique({ where: { id: menuId } })
    if (!menu) throw new ApiError("Menu tidak ditemukan", 404)

    // Validasi duplikat bahan
    const ids = rows.map((r) => String(r.bahanId))
    if (new Set(ids).size !== ids.length) throw new ApiError("Ada bahan duplikat dalam resep")

    for (const r of rows) {
      const qty = Number(r.qty)
      if (!qty || qty <= 0) throw new ApiError("Qty bahan harus lebih dari 0")
      const bahan = await db.bahanBaku.findUnique({ where: { id: String(r.bahanId) } })
      if (!bahan) throw new ApiError("Ada bahan yang tidak ditemukan")
    }

    await db.$transaction([
      db.resep.deleteMany({ where: { menuId } }),
      ...(rows.length
        ? [db.resep.createMany({ data: rows.map((r) => ({ menuId, bahanId: String(r.bahanId), qty: Number(r.qty) })) })]
        : []),
    ])
    await logAudit(user, "RESEP_SIMPAN", `${menu.kode} ${menu.nama} (${rows.length} bahan)`)
    return ok({ saved: rows.length })
  })
}
