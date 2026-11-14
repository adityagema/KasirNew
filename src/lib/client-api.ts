"use client"

interface OpsiApi extends RequestInit {
  json?: unknown
}

export async function api<T>(path: string, options?: OpsiApi): Promise<T> {
  const { json, ...rest } = options ?? {}
  const res = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  let data: { success?: boolean; data?: T; message?: string; error?: string }
  try {
    data = await res.json()
  } catch {
    throw new Error("Respons server tidak valid")
  }
  if (!res.ok || data?.success !== true) {
    throw new Error(data?.message || data?.error || `Permintaan gagal: ${path}`)
  }
  return data.data as T
}
