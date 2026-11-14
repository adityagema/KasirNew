import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { COOKIE_NAME } from "@/lib/auth"
import { handle, ok } from "@/lib/api"

export async function POST(req: NextRequest) {
  return handle(async () => {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (token) {
      await db.session.deleteMany({ where: { token } })
    }
    const res = ok({ loggedOut: true })
    res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 })
    return res
  })
}
