"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { BahanBaku, MutasiStok } from "@/lib/types"
import { rupiah, angka, tanggalJam } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, PackageSearch, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function StokView() {
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [mutasi, setMutasi] = useState<MutasiStok[]>([])
  const [loading, setLoading] = useState(true)

  const [formBuka, setFormBuka] = useState(false)
  const [edit, setEdit] = useState<BahanBaku | null>(null)
  const [nama, setNama] = useState("")
  const [satuan, setSatuan] = useState("")
  const [stok, setStok] = useState("0")
  const [minStok, setMinStok] = useState("0")
  const [hargaModal, setHargaModal] = useState("0")

  const [mutasiBuka, setMutasiBuka] = useState(false)
  const [mutasiBahan, setMutasiBahan] = useState<BahanBaku | null>(null)
  const [mutasiTipe, setMutasiTipe] = useState<"MASUK" | "KELUAR">("MASUK")
  const [mutasiQty, setMutasiQty] = useState("")
  const [mutasiKet, setMutasiKet] = useState("")

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [b, m] = await Promise.all([
        api<BahanBaku[]>("/api/stok/bahan"),
        api<MutasiStok[]>("/api/stok/mutasi?limit=80"),
      ])
      setBahan(b)
      setMutasi(m)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat stok")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { muat() }, [muat])

  function bukaForm(b?: BahanBaku) {
    setEdit(b ?? null)
    setNama(b?.nama ?? "")
    setSatuan(b?.satuan ?? "")
    setStok(String(b?.stok ?? 0))
    setMinStok(String(b?.minStok ?? 0))
    setHargaModal(String(b?.hargaModal ?? 0))
    setFormBuka(true)
  }

  async function simpanBahan() {
    if (!nama.trim() || !satuan.trim()) return toast.error("Nama dan satuan wajib diisi")
    try {
      if (edit) {
        await api(`/api/stok/bahan/${edit.id}`, {
          method: "PUT",
          json: {
            nama: nama.trim(), satuan: satuan.trim(),
            minStok: Number(minStok), hargaModal: Number(hargaModal),
            stok: Number(stok),
          },
        })
        toast.success("Bahan diperbarui")
      } else {
        await api("/api/stok/bahan", {
          method: "POST",
          json: { nama: nama.trim(), satuan: satuan.trim(), stok: Number(stok), minStok: Number(minStok), hargaModal: Number(hargaModal) },
        })
        toast.success("Bahan ditambahkan")
      }
      setFormBuka(false)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan")
    }
  }

  async function hapusBahan(b: BahanBaku) {
    if (!confirm(`Hapus bahan "${b.nama}"?`)) return
    try {
      await api(`/api/stok/bahan/${b.id}`, { method: "DELETE" })
      toast.success("Bahan dinonaktifkan/dihapus")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  async function simpanMutasi() {
    if (!mutasiBahan || !Number(mutasiQty)) return toast.error("Jumlah wajib diisi")
    try {
      await api("/api/stok/mutasi", {
        method: "POST",
        json: { bahanId: mutasiBahan.id, tipe: mutasiTipe, qty: Number(mutasiQty), keterangan: mutasiKet.trim() || undefined },
      })
      toast.success(`Stok ${mutasiTipe === "MASUK" ? "masuk" : "keluar"} dicatat`)
      setMutasiBuka(false)
      setMutasiQty("")
      setMutasiKet("")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan mutasi")
    }
  }

  const menipis = bahan.filter((b) => b.aktif && b.stok <= b.minStok)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {menipis.length > 0 && (
          <Badge className="bg-rose-100 text-rose-800 border-0">{menipis.length} bahan menipis</Badge>
        )}
        <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white ml-auto" onClick={() => bukaForm()}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Bahan
        </Button>
      </div>

      <Tabs defaultValue="bahan">
        <TabsList>
          <TabsTrigger value="bahan">Bahan Baku</TabsTrigger>
          <TabsTrigger value="mutasi">Riwayat Mutasi</TabsTrigger>
        </TabsList>

        <TabsContent value="bahan">
          <div className="bg-white rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bahan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Harga Modal</TableHead>
                  <TableHead className="text-center">Resep</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && bahan.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Memuat...</TableCell></TableRow>
                )}
                {bahan.map((b) => (
                  <TableRow key={b.id} className={b.aktif ? "" : "opacity-50"}>
                    <TableCell>
                      <p className="font-semibold text-slate-800">{b.nama}</p>
                      <p className="text-xs text-slate-400">{b.id}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${b.stok <= b.minStok && b.aktif ? "text-rose-600" : "text-slate-700"}`}>
                        {angka(b.stok)} {b.satuan}
                      </span>
                      {b.stok <= b.minStok && b.aktif && (
                        <Badge className="bg-rose-100 text-rose-700 border-0 text-[10px] ml-1">menipis</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">{angka(b.minStok)}</TableCell>
                    <TableCell className="text-right text-slate-500">{rupiah(b.hargaModal)}</TableCell>
                    <TableCell className="text-center text-sm">{b.jumlahResep ?? 0} menu</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600" title="Stok masuk"
                          onClick={() => { setMutasiBahan(b); setMutasiTipe("MASUK"); setMutasiBuka(true) }}>
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7 text-orange-600" title="Stok keluar"
                          onClick={() => { setMutasiBahan(b); setMutasiTipe("KELUAR"); setMutasiBuka(true) }}>
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bukaForm(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7 text-rose-600" onClick={() => hapusBahan(b)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mutasi">
          <div className="bg-white rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Bahan</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Stok Akhir</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutasi.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Belum ada mutasi.</TableCell></TableRow>
                )}
                {mutasi.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-slate-500">{tanggalJam(m.createdAt)}</TableCell>
                    <TableCell className="font-medium">{m.bahan?.nama ?? m.bahanId}</TableCell>
                    <TableCell>
                      <Badge className={`${m.tipe === "OTOMATIS" ? "bg-sky-100 text-sky-800" : m.tipe === "MASUK" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"} border-0`}>
                        {m.tipe}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{angka(m.qty)} {m.bahan?.satuan}</TableCell>
                    <TableCell className="text-right">{angka(m.stokSesudah)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{m.keterangan ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Form bahan */}
      <Dialog open={formBuka} onOpenChange={setFormBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{edit ? `Ubah ${edit.nama}` : "Tambah Bahan Baku"}</DialogTitle>
            <DialogDescription>
              {edit ? "Mengubah stok di sini dicatat sebagai PENYESUAIAN." : "ID bahan dibuat otomatis."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nama Bahan</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Beras" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Satuan</Label>
                <Input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="kg / gr / pcs" /></div>
              <div className="space-y-1.5"><Label>{edit ? "Stok (penyesuaian)" : "Stok Awal"}</Label>
                <Input type="number" value={stok} onChange={(e) => setStok(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Stok Minimum</Label>
                <Input type="number" value={minStok} onChange={(e) => setMinStok(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Harga Modal / Satuan</Label>
                <Input type="number" value={hargaModal} onChange={(e) => setHargaModal(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={simpanBahan} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">Simpan</Button>
              <Button variant="outline" onClick={() => setFormBuka(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form mutasi */}
      <Dialog open={mutasiBuka} onOpenChange={setMutasiBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4" /> Mutasi: {mutasiBahan?.nama}
            </DialogTitle>
            <DialogDescription>Stok saat ini: {angka(mutasiBahan?.stok ?? 0)} {mutasiBahan?.satuan}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMutasiTipe("MASUK")}
                className={`py-2 rounded-lg text-sm font-bold border ${mutasiTipe === "MASUK" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}>
                Stok Masuk
              </button>
              <button onClick={() => setMutasiTipe("KELUAR")}
                className={`py-2 rounded-lg text-sm font-bold border ${mutasiTipe === "KELUAR" ? "bg-orange-600 text-white border-orange-600" : "bg-white"}`}>
                Stok Keluar
              </button>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah ({mutasiBahan?.satuan})</Label>
              <Input type="number" min={0.1} step="any" value={mutasiQty} onChange={(e) => setMutasiQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input value={mutasiKet} onChange={(e) => setMutasiKet(e.target.value)} placeholder="Belanja tanggal 14 Nov" />
            </div>
            <div className="flex gap-2">
              <Button onClick={simpanMutasi} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">Simpan Mutasi</Button>
              <Button variant="outline" onClick={() => setMutasiBuka(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
