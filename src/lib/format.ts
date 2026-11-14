export function rupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n || 0))
}

export function angka(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n || 0)
}

export function waktu(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function tanggalJam(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function tanggalPenuh(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

export function ymdHariIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
}

export const LABEL_TIPE: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKE_AWAY: "Take Away",
  DELIVERY: "Delivery",
}

export const LABEL_STATUS: Record<string, string> = {
  PENDING: "Baru",
  PREPARING: "Dimasak",
  READY: "Siap",
  SERVED: "Disajikan",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
}

export function kelasBadgeStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-slate-200 text-slate-700"
    case "PREPARING":
      return "bg-amber-100 text-amber-800"
    case "READY":
      return "bg-sky-100 text-sky-800"
    case "SERVED":
      return "bg-violet-100 text-violet-800"
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800"
    case "CANCELLED":
      return "bg-rose-100 text-rose-800"
    default:
      return "bg-slate-200 text-slate-700"
  }
}
