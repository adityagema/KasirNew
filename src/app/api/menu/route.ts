import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { ApiError, handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() ?? ""
    const kategoriId = searchParams.get("kategori") ?? ""
    const showAll = searchParams.get("semua") === "1" && user.role === "MANAGEMENT"

    const where: Record<string, unknown> = { aktif: true }
    if (q) where.nama = { contains: q }
    if (kategoriId) where.kategoriId = kategoriId
    if (!showAll) where.aktif = true

    const rows = await db.menu.findMany({
      where,
      orderBy: { kode: "asc" },
      include: {
        kategori: { select: { id: true, nama: true } },
        resep: { select: { id: true } },
        _count: { select: { resep: true } },
      },
    })
    // HargaPokok / resep hanya untuk management
    if (user.role !== "MANAGEMENT") {
      return ok(
        rows.map(({ resep: _r, _count: _c, ...rest }) => ({ ...rest, jumlahResep: _c.resep }))
      )
    }
    return ok(rows.map((r) => ({ ...r, jumlahResep: r._count.resep })))
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    const nama = String(body?.nama ?? "").trim()
    const kategoriId = String(body?.kategoriId ?? "")
    const harga = Number(body?.harga ?? 0)
    if (!nama) throw new ApiError("Nama menu wajib diisi")
    if (!kategoriId) throw new ApiError("Kategori wajib dipilih")
    if (!harga || harga <= 0) throw new ApiError("Harga harus lebih dari 0")

    const kategori = await db.kategori.findUnique({ where: { id: kategoriId } })
    if (!kategori) throw new ApiError("Kategori tidak ditemukan", 404)

    const jumlahMenu = await db.menu.count()
    const kode = `MNU${String(jumlahMenu + 1).padStart(3, "0")}-${Date.now().toString().slice(-3)}`

    const row = await db.menu.create({
      data: {
        kode,
        nama,
        kategoriId,
        harga: Math.round(harga),
        deskripsi: body?.deskripsi ? String(body.deskripsi) : null,
        foto: body?.foto ? String(body.foto) : null,
        tersedia: body?.tersedia !== false,
        aktif: true,
      },
    })
    await logAudit(user, "MENU_TAMBAH", `${kode} ${nama}`)
    return ok(row, 201)
  })
}
