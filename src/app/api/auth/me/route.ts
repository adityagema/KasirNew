import { NextRequest } from "next/server"
import { requireUser } from "@/lib/auth"
import { handle, ok } from "@/lib/api"

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser(req)
    return ok(user)
  })
}
