"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { AuditRow } from "@/lib/types"
import { tanggalJam } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

const WARNA_AKSI: Record<string, string> = {
  LOGIN: "bg-slate-100 text-slate-700",
  PESANAN_BARU: "bg-orange-100 text-orange-800",
  PEMBAYARAN: "bg-emerald-100 text-emerald-800",
}

export default function AuditView() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<AuditRow[]>(`/api/audit?q=${encodeURIComponent(q.trim())}&limit=150`)
      setRows(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const t = setTimeout(muat, 300)
    return () => clearTimeout(t)
  }, [muat])

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari aksi / pengguna / detail..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">Memuat...</TableCell></TableRow>
              )}
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">Belum ada aktivitas.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-slate-500 whitespace-nowrap">{tanggalJam(r.createdAt)}</TableCell>
                  <TableCell className="font-medium">{r.userNama ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={`${WARNA_AKSI[r.aksi] ?? "bg-blue-50 text-blue-800"} border-0`}>{r.aksi}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{r.detail ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}
