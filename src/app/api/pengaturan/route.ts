import { NextRequest } from "next/server"
import { requireUser, logAudit } from "@/lib/auth"
import { getSettings, saveSettings } from "@/lib/settings"
import { handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req)
    return ok(await getSettings())
  })
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req, ["MANAGEMENT"])
    const body = await req.json()
    // validasi angka
    for (const k of ["PAJAK_PERSEN", "SERVICE_PERSEN", "SESSION_JAM"]) {
      if (body?.[k] !== undefined) {
        const n = Number(body[k])
        if (isNaN(n) || n < 0) return ok({ error: `${k} tidak valid` }, 400)
      }
    }
    if (body?.STRUK_UKURAN !== undefined && !["58", "80"].includes(String(body.STRUK_UKURAN))) {
      return ok({ error: "Ukuran struk harus 58 atau 80" }, 400)
    }
    if (body?.STOK_REDUCE_ON !== undefined && !["PAYMENT", "KIRIM"].includes(String(body.STOK_REDUCE_ON))) {
      return ok({ error: "STOK_REDUCE_ON harus PAYMENT atau KIRIM" }, 400)
    }
    const clean: Record<string, string> = {}
    for (const k of ["NAMA_RESTORAN", "ALAMAT", "TELEPON", "PAJAK_PERSEN", "SERVICE_PERSEN", "STRUK_UKURAN", "STOK_REDUCE_ON", "SESSION_JAM", "FOOTER_STRUK"]) {
      if (body?.[k] !== undefined) clean[k] = String(body[k])
    }
    const settings = await saveSettings(clean)
    await logAudit(user, "PENGATURAN_UBAH", Object.keys(clean).join(", "))
    return ok(settings)
  })
}
