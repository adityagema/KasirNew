"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Save } from "lucide-react"
import { toast } from "sonner"

export default function PengaturanView() {
  const [form, setForm] = useState<Settings | null>(null)
  const [simpan, setSimpan] = useState(false)

  useEffect(() => {
    api<Settings>("/api/pengaturan").then(setForm)
  }, [])

  async function simpanPengaturan() {
    if (!form) return
    setSimpan(true)
    try {
      const hasil = await api<Settings>("/api/pengaturan", { method: "PUT", json: form })
      setForm(hasil)
      toast.success("Pengaturan disimpan")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setSimpan(false)
    }
  }

  function ubah<K extends keyof Settings>(key: K, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  if (!form) return <p className="text-slate-400 text-sm">Memuat pengaturan...</p>

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Identitas Restoran</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama Restoran</Label>
            <Input value={form.NAMA_RESTORAN} onChange={(e) => ubah("NAMA_RESTORAN", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input value={form.ALAMAT} onChange={(e) => ubah("ALAMAT", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon</Label>
              <Input value={form.TELEPON} onChange={(e) => ubah("TELEPON", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pajak & Biaya</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Pajak (%)</Label>
            <Input type="number" min={0} step="0.1" value={form.PAJAK_PERSEN} onChange={(e) => ubah("PAJAK_PERSEN", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Service Charge (%)</Label>
            <Input type="number" min={0} step="0.1" value={form.SERVICE_PERSEN} onChange={(e) => ubah("SERVICE_PERSEN", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Struk & Operasional</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ukuran Struk</Label>
            <Select value={form.STRUK_UKURAN} onValueChange={(v) => ubah("STRUK_UKURAN", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58 mm (printer mini)</SelectItem>
                <SelectItem value="80">80 mm (printer standar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Potong Stok Saat</Label>
            <Select value={form.STOK_REDUCE_ON} onValueChange={(v) => ubah("STOK_REDUCE_ON", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYMENT">Saat pembayaran lunas</SelectItem>
                <SelectItem value="KIRIM">Saat pesanan disajikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durasi Sesi Login (jam)</Label>
            <Input type="number" min={1} value={form.SESSION_JAM} onChange={(e) => ubah("SESSION_JAM", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Footer Struk</Label>
            <Input value={form.FOOTER_STRUK} onChange={(e) => ubah("FOOTER_STRUK", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={simpanPengaturan} disabled={simpan} className="bg-[#f97316] hover:bg-[#ea580c] text-white">
        <Save className="h-4 w-4 mr-2" /> {simpan ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </div>
  )
}
