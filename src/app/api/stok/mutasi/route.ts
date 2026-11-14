import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

/** GET: riwayat mutasi stok */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const { searchParams } = new URL(req.url)
    const bahanId = searchParams.get("bahan") ?? ""
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 300)
    const rows = await db.mutasiStok.findMany({
      where: bahanId ? { bahanId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { bahan: { select: { nama: true, satuan: true } } },
    })
    return ok(rows)
  })
}

/** POST: stok masuk / keluar manual */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const bahanId = String(body?.bahanId ?? "")
    const tipe = String(body?.tipe ?? "") // MASUK | KELUAR
    const qty = Number(body?.qty ?? 0)
    if (!["MASUK", "KELUAR"].includes(tipe)) throw new ApiError("Tipe mutasi harus MASUK atau KELUAR")
    if (!qty || qty <= 0) throw new ApiError("Jumlah harus lebih dari 0")

    const bahan = await db.bahanBaku.findUnique({ where: { id: bahanId } })
    if (!bahan) throw new ApiError("Bahan tidak ditemukan", 404)

    const stokSesudah = tipe === "MASUK" ? bahan.stok + qty : bahan.stok - qty
    await db.bahanBaku.update({ where: { id: bahanId }, data: { stok: stokSesudah } })
    const mutasi = await db.mutasiStok.create({
      data: {
        bahanId,
        tipe,
        qty,
        stokSesudah,
        keterangan: body?.keterangan ? String(body.keterangan).slice(0, 200) : null,
        userId: user.id,
      },
    })
    await logAudit(user, `STOK_${tipe}`, `${bahan.nama} ${tipe === "MASUK" ? "+" : "-"}${qty} ${bahan.satuan}`)
    return ok(mutasi, 201)
  })
}
