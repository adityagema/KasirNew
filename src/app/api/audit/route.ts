import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser(req, ["MANAGEMENT"])
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 300)
    const rows = await db.auditLog.findMany({
      where: q
        ? {
            OR: [
              { aksi: { contains: q } },
              { detail: { contains: q } },
              { userNama: { contains: q } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return ok(rows)
  })
}
