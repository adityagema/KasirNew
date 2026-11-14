"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/client-api"
import type { Pesanan } from "@/lib/types"
import { waktu, LABEL_TIPE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Printer, ChefHat, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { KotPesanan } from "@/components/pos/StrukKot"

function menitSejak(iso: string, serverTime: number): number {
  return Math.max(0, Math.floor((serverTime - new Date(iso).getTime()) / 60000))
}

function KartuPesanan({ p, serverTime, onAksi }: {
  p: Pesanan
  serverTime: number
  onAksi: (id: string, aksi: string) => void
}) {
  const menit = menitSejak(p.createdAt, serverTime)
  const lama = menit >= 15
  const [kot, setKot] = useState(false)

  return (
    <div className={`rounded-xl border-2 bg-white p-3 shadow-sm ${lama ? "border-rose-400" : "border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-slate-800">{p.id}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lama ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
          {menit} menit
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">
        {LABEL_TIPE[p.tipe]}{p.meja ? ` · ${p.meja.nama}` : p.namaPelanggan ? ` · ${p.namaPelanggan}` : ""} · {waktu(p.createdAt)}
      </p>

      <div className="mt-2 space-y-1.5 border-t pt-2">
        {(p.items ?? []).map((it) => (
          <div key={it.id}>
            <p className="text-sm font-bold text-slate-800">{it.qty}× {it.namaMenu}</p>
            {it.catatan && <p className="text-xs italic text-[#c2410c]">&raquo; {it.catatan}</p>}
          </div>
        ))}
        {p.catatan && <p className="text-xs font-semibold text-amber-700">Catatan: {p.catatan}</p>}
      </div>

      <div className="flex gap-1.5 mt-3">
        {p.status === "PENDING" && (
          <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs" onClick={() => onAksi(p.id, "MULAI")}>
            <ChefHat className="h-3.5 w-3.5 mr-1" /> Mulai Masak
          </Button>
        )}
        {p.status === "PREPARING" && (
          <Button size="sm" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs" onClick={() => onAksi(p.id, "SIAP")}>
            Tandai Siap
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => {
            setKot(true)
            setTimeout(() => window.print(), 150)
          }}
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      </div>

      {kot && (
        <div className="print-area">
          <KotPesanan pesanan={p} />
        </div>
      )}
    </div>
  )
}

export default function DapurView() {
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [serverTime, setServerTime] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    try {
      const data = await api<{ serverTime: string; pesanan: Pesanan[] }>("/api/dapur")
      setPesanan(data.pesanan)
      setServerTime(new Date(data.serverTime).getTime())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat dapur")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
    const poll = setInterval(muat, 10000) // polling ringan tiap 10 detik
    const jam = setInterval(() => setServerTime((t) => t + 30000), 30000) // naikkan umur tiap 30 dtk
    return () => { clearInterval(poll); clearInterval(jam) }
  }, [muat])

  async function aksi(id: string, aksiStr: string) {
    try {
      await api(`/api/pesanan/${id}/status`, { method: "POST", json: { aksi: aksiStr } })
      toast.success(`${id}: ${aksiStr === "MULAI" ? "mulai dimasak" : "ditandai siap"}`)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status")
    }
  }

  const baru = pesanan.filter((p) => p.status === "PENDING")
  const dimasak = pesanan.filter((p) => p.status === "PREPARING")
  const siap = pesanan.filter((p) => p.status === "READY")

  const kolom = [
    { judul: "Baru (Menunggu)", data: baru, warna: "bg-slate-700" },
    { judul: "Dimasak", data: dimasak, warna: "bg-amber-600" },
    { judul: "Siap Diantar", data: siap, warna: "bg-sky-600" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-slate-200 text-slate-700 border-0">Auto refresh 10 detik</Badge>
        <Button size="sm" variant="outline" onClick={muat}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Segarkan</Button>
      </div>

      {loading && pesanan.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 items-start">
          {kolom.map((k) => (
            <div key={k.judul} className="rounded-xl border bg-slate-50 overflow-hidden">
              <div className={`${k.warna} text-white px-3 py-2 flex items-center justify-between`}>
                <p className="font-bold text-sm">{k.judul}</p>
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{k.data.length}</span>
              </div>
              <div className="p-2.5 space-y-2.5 max-h-[70vh] overflow-y-auto thin-scroll">
                {k.data.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Tidak ada pesanan.</p>}
                {k.data.map((p) => (
                  <KartuPesanan key={p.id} p={p} serverTime={serverTime} onAksi={aksi} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
