import { NextResponse } from "next/server"

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ApiError) return fail(e.message, e.status)
    console.error("[API]", e)
    return fail("Terjadi kesalahan internal pada server", 500)
  }
}
