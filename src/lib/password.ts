import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

/**
 * Hash password memakai scrypt (bawaan Node.js) + salt acak per user.
 * Format tersimpan: "salthex:hashhex"
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":")
    if (!salt || !hash) return false
    const candidate = scryptSync(password, salt, 64)
    const target = Buffer.from(hash, "hex")
    if (candidate.length !== target.length) return false
    return timingSafeEqual(candidate, target)
  } catch {
    return false
  }
}
