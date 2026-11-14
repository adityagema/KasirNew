import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { bebaskanMejaJikaKosong, prosesStokPesanan } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

const TRANSISI: Record<string, { dari: string[]; ke: string }> = {
  MULAI: { dari: ["PENDING"], ke: "PREPARING" },
  SIAP: { dari: ["PREPARING"], ke: "READY" },
  SAJIKAN: { dari: ["READY"], ke: "SERVED" },
  BATAL: { dari: ["PENDING", "PREPARING", "READY", "SERVED"], ke: "CANCELLED" },
}

export async function POST(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req)
    const { id } = await params
    const body = await req.json()
    const aksi = String(body?.aksi ?? "")

    // BATAL boleh oleh kasir & management; transisi dapur boleh kedua peran juga
    const transisi = TRANSISI[aksi]
    if (!transisi) throw new ApiError("Aksi status tidak dikenal")

    const pesanan = await db.pesanan.findUnique({ where: { id } })
    if (!pesanan) throw new ApiError("Pesanan tidak ditemukan", 404)

    if (aksi === "BATAL") {
      if (pesanan.status === "COMPLETED") throw new ApiError("Pesanan sudah selesai, tidak bisa dibatalkan")
      if (pesanan.status === "CANCELLED") throw new ApiError("Pesanan sudah dibatalkan")
      const jumlahBayar = await db.pembayaran.count({ where: { pesananId: id } })
      if (jumlahBayar > 0) {
        throw new ApiError("Pesanan sudah memiliki pembayaran. Gunakan alur refund manual/manajemen.")
      }
    } else if (!transisi.dari.includes(pesanan.status)) {
      throw new ApiError(
        `Aksi ${aksi} tidak valid: status pesanan saat ini ${pesanan.status} (harus ${transisi.dari.join("/")})`
      )
    }

    if (aksi === "SAJIKAN") {
      const settings = await getSettings()
      if (settings.STOK_REDUCE_ON === "KIRIM") {
        await prosesStokPesanan(id, user.id)
      }
    }

    const updated = await db.pesanan.update({
      where: { id },
      data: { status: transisi.ke, catatan: aksi === "BATAL" && body?.alasan ? String(body.alasan) : undefined },
      include: { items: true, meja: { select: { nama: true } } },
    })

    if (aksi === "BATAL") {
      await bebaskanMejaJikaKosong(pesanan.mejaId)
    }
    await logAudit(user, `PESANAN_${aksi}`, `${id} → ${transisi.ke}`)
    return ok(updated)
  })
}
