import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").trim()
    const rows = await db.bahanBaku.findMany({
      where: q ? { nama: { contains: q } } : {},
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { resep: true } } },
    })
    return ok(rows.map((r) => ({ ...r, jumlahResep: r._count.resep, bolehHapus: r._count.resep === 0, peran: user.role })))
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    const satuan = String(body?.satuan ?? "").trim() || "pcs"
    if (!nama) throw new ApiError("Nama bahan wajib diisi")
    const ada = await db.bahanBaku.findFirst({ where: { nama } })
    if (ada) throw new ApiError("Bahan dengan nama tersebut sudah ada")

    const jumlah = await db.bahanBaku.count()
    const stokAwal = Number(body?.stok ?? 0)
    const row = await db.bahanBaku.create({
      data: {
        id: `BHN${String(jumlah + 1).padStart(3, "0")}-${Date.now().toString().slice(-3)}`,
        nama,
        satuan,
        stok: stokAwal,
        minStok: Number(body?.minStok ?? 0),
        hargaModal: Number(body?.hargaModal ?? 0),
        aktif: true,
      },
    })
    if (stokAwal > 0) {
      await db.mutasiStok.create({
        data: {
          bahanId: row.id,
          tipe: "MASUK",
          qty: stokAwal,
          stokSesudah: stokAwal,
          keterangan: "Stok awal",
          userId: user.id,
        },
      })
    }
    await logAudit(user, "BAHAN_TAMBAH", nama)
    return ok(row, 201)
  })
}
