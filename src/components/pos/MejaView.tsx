"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser, Meja } from "@/lib/types"
import { rupiah, waktu, LABEL_STATUS, LABEL_TIPE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Armchair, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const WARNA_STATUS: Record<string, string> = {
  KOSONG: "border-emerald-300 bg-emerald-50",
  TERISI: "border-rose-300 bg-rose-50",
  RESERVASI: "border-amber-300 bg-amber-50",
}
const TEKS_STATUS: Record<string, string> = {
  KOSONG: "bg-emerald-600",
  TERISI: "bg-rose-600",
  RESERVASI: "bg-amber-500",
}

export default function MejaView({ user }: { user: SessionUser }) {
  const [meja, setMeja] = useState<Meja[]>([])
  const [loading, setLoading] = useState(true)
  const [formBuka, setFormBuka] = useState(false)
  const [edit, setEdit] = useState<Meja | null>(null)
  const [nama, setNama] = useState("")
  const [kapasitas, setKapasitas] = useState("2")
  const [simpan, setSimpan] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api<Meja[]>("/api/meja")
      setMeja(rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat meja")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
    const t = setInterval(muat, 15000)
    return () => clearInterval(t)
  }, [muat])

  function bukaForm(m?: Meja) {
    setEdit(m ?? null)
    setNama(m?.nama ?? "")
    setKapasitas(String(m?.kapasitas ?? 2))
    setFormBuka(true)
  }

  async function simpanMeja() {
    if (!nama.trim()) return toast.error("Nama meja wajib diisi")
    setSimpan(true)
    try {
      if (edit) {
        await api(`/api/meja/${edit.id}`, { method: "PUT", json: { nama: nama.trim(), kapasitas: Number(kapasitas) } })
        toast.success("Meja diperbarui")
      } else {
        await api("/api/meja", { method: "POST", json: { nama: nama.trim(), kapasitas: Number(kapasitas) } })
        toast.success("Meja ditambahkan")
      }
      setFormBuka(false)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan meja")
    } finally {
      setSimpan(false)
    }
  }

  async function hapusMeja(m: Meja) {
    if (!confirm(`Hapus ${m.nama}?`)) return
    try {
      await api(`/api/meja/${m.id}`, { method: "DELETE" })
      toast.success("Meja dihapus")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  const totalMeja = meja.length
  const terisi = meja.filter((m) => m.status === "TERISI").length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-rose-100 text-rose-800 border-0">{terisi} terisi</Badge>
        <Badge className="bg-emerald-100 text-emerald-800 border-0">{totalMeja - terisi} kosong / {totalMeja}</Badge>
        <Button size="sm" variant="outline" onClick={muat}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Segarkan</Button>
        {user.role === "MANAGEMENT" && (
          <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white ml-auto" onClick={() => bukaForm()}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Meja
          </Button>
        )}
      </div>

      {loading && meja.length === 0 ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
          {meja.map((m) => (
            <div key={m.id} className={`rounded-xl border-2 p-3 ${WARNA_STATUS[m.status]}`}>
              <div className="flex items-start justify-between">
                <Armchair className={`h-6 w-6 ${m.status === "TERISI" ? "text-rose-500" : m.status === "RESERVASI" ? "text-amber-500" : "text-emerald-600"}`} />
                <Badge className={`${TEKS_STATUS[m.status]} border-0 text-[10px]`}>{m.status}</Badge>
              </div>
              <p className="font-bold text-slate-800 mt-2">{m.nama}</p>
              <p className="text-xs text-slate-500">Kapasitas {m.kapasitas} orang</p>

              {(m.pesananAktif ?? []).length > 0 && (
                <div className="mt-2 space-y-1">
                  {m.pesananAktif!.map((p) => (
                    <div key={p.id} className="rounded-lg bg-white border px-2 py-1.5 text-xs">
                      <p className="font-semibold text-slate-700">{p.id}</p>
                      <p className="text-slate-400">{LABEL_TIPE[p.tipe]} · {waktu(p.createdAt)}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-bold text-[#f97316]">{rupiah(p.total)}</span>
                        <span className="text-slate-500">{LABEL_STATUS[p.status]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {user.role === "MANAGEMENT" && (
                <div className="flex gap-1.5 mt-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => bukaForm(m)}>Ubah</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 hover:text-rose-700" onClick={() => hapusMeja(m)}>Hapus</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog tambah/ubah meja */}
      <Dialog open={formBuka} onOpenChange={setFormBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{edit ? "Ubah Meja" : "Tambah Meja"}</DialogTitle>
            <DialogDescription>Nama meja harus unik.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Meja</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Meja 09" />
            </div>
            <div className="space-y-1.5">
              <Label>Kapasitas (orang)</Label>
              <Input type="number" min={1} value={kapasitas} onChange={(e) => setKapasitas(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={simpanMeja} disabled={simpan} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
                {simpan ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" onClick={() => setFormBuka(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
