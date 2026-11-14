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
    const bahan = await db.bahanBaku.findUnique({ where: { id } })
    if (!bahan) throw new ApiError("Bahan tidak ditemukan", 404)

    const data: Record<string, unknown> = {}
    if (body?.nama !== undefined) data.nama = String(body.nama).trim()
    if (body?.satuan !== undefined) data.satuan = String(body.satuan).trim() || "pcs"
    if (body?.minStok !== undefined) data.minStok = Number(body.minStok) || 0
    if (body?.hargaModal !== undefined) data.hargaModal = Number(body.hargaModal) || 0
    if (typeof body?.aktif === "boolean") data.aktif = body.aktif

    // Ubah stok langsung = penyesuaian (dicatat sebagai mutasi)
    if (body?.stok !== undefined) {
      const stokBaru = Number(body.stok)
      if (isNaN(stokBaru)) throw new ApiError("Stok tidak valid")
      if (stokBaru !== bahan.stok) {
        data.stok = stokBaru
        await db.mutasiStok.create({
          data: {
            bahanId: id,
            tipe: "PENYESUAIAN",
            qty: Math.abs(stokBaru - bahan.stok),
            stokSesudah: stokBaru,
            keterangan: `Penyesuaian manual: ${bahan.stok} → ${stokBaru}`,
            userId: user.id,
          },
        })
      }
    }

    const row = await db.bahanBaku.update({ where: { id }, data })
    await logAudit(user, "BAHAN_UBAH", row.nama)
    return ok(row)
  })
}

export async function DELETE(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const { id } = await params
    const jumlahResep = await db.resep.count({ where: { bahanId: id } })
    if (jumlahResep > 0) {
      throw new ApiError(`Tidak bisa dihapus: bahan dipakai di ${jumlahResep} resep`)
    }
    const bahan = await db.bahanBaku.findUnique({ where: { id } })
    await db.bahanBaku.update({ where: { id }, data: { aktif: false } })
    await logAudit(user, "BAHAN_HAPUS", bahan?.nama ?? id)
    return ok({ deleted: true })
  })
}
