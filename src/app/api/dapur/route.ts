import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { handle, ok } from "@/lib/api"

/** GET: pesanan untuk kitchen display (PENDING/PREPARING/READY) — untuk polling */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    const rows = await db.pesanan.findMany({
      where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      orderBy: { createdAt: "asc" },
      include: {
        items: { orderBy: { createdAt: "asc" }, select: { id: true, namaMenu: true, qty: true, catatan: true } },
        meja: { select: { nama: true } },
      },
    })
    return ok({
      serverTime: new Date().toISOString(),
      pesanan: rows,
    })
  })
}
