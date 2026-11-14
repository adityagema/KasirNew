"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser, Menu, Kategori, BahanBaku, ResepRow } from "@/lib/types"
import { rupiah } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Search, Camera, Utensils, Layers, Pencil, Trash2, FlaskConical, X } from "lucide-react"
import { toast } from "sonner"

export default function MenuView({ user }: { user: SessionUser }) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [q, setQ] = useState("")
  const [katFilter, setKatFilter] = useState("semua")
  const [loading, setLoading] = useState(true)

  const [formMenu, setFormMenu] = useState<{ buka: boolean; edit: Menu | null }>({ buka: false, edit: null })
  const [nama, setNama] = useState("")
  const [kategoriId, setKategoriId] = useState("")
  const [harga, setHarga] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [tersedia, setTersedia] = useState(true)
  const [simpan, setSimpan] = useState(false)

  const [katBuka, setKatBuka] = useState(false)
  const [namaKatBaru, setNamaKatBaru] = useState("")
  const [editKat, setEditKat] = useState<{ id: string; nama: string } | null>(null)

  const [resepMenu, setResepMenu] = useState<Menu | null>(null)
  const [resepRows, setResepRows] = useState<ResepRow[]>([])
  const [bahan, setBahan] = useState<BahanBaku[]>([])
  const [simpanResep, setSimpanResep] = useState(false)

  const management = user.role === "MANAGEMENT"

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [m, k] = await Promise.all([
        api<Menu[]>(management ? "/api/menu?semua=1" : "/api/menu"),
        api<Kategori[]>("/api/kategori"),
      ])
      setMenus(m)
      setKategori(k)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat menu")
    } finally {
      setLoading(false)
    }
  }, [management])

  useEffect(() => { muat() }, [muat])

  const tampil = menus.filter(
    (m) =>
      (katFilter === "semua" || m.kategoriId === katFilter) &&
      (!q.trim() || m.nama.toLowerCase().includes(q.toLowerCase()) || m.kode.toLowerCase().includes(q.toLowerCase()))
  )

  async function gantiTersedia(m: Menu, v: boolean) {
    try {
      await api(`/api/menu/${m.id}`, { method: "PUT", json: { tersedia: v } })
      toast.success(`${m.nama}: ${v ? "tersedia" : "sold out"}`)
      setMenus((prev) => prev.map((x) => (x.id === m.id ? { ...x, tersedia: v } : x)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah")
    }
  }

  async function simpanMenu() {
    if (!nama.trim()) return toast.error("Nama menu wajib diisi")
    if (!kategoriId) return toast.error("Kategori wajib dipilih")
    if (!Number(harga)) return toast.error("Harga wajib diisi")
    setSimpan(true)
    try {
      const json: Record<string, unknown> = {
        nama: nama.trim(),
        kategoriId,
        harga: Number(harga),
        deskripsi: deskripsi.trim() || undefined,
        tersedia,
      }
      if (foto !== null) json.foto = foto
      if (formMenu.edit) {
        await api(`/api/menu/${formMenu.edit.id}`, { method: "PUT", json })
        toast.success("Menu diperbarui")
      } else {
        await api("/api/menu", { method: "POST", json })
        toast.success("Menu ditambahkan")
      }
      setFormMenu({ buka: false, edit: null })
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setSimpan(false)
    }
  }

  async function hapusMenu(m: Menu) {
    if (!confirm(`Hapus menu "${m.nama}"?`)) return
    try {
      await api(`/api/menu/${m.id}`, { method: "DELETE" })
      toast.success("Menu dihapus (nonaktif)")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  // ---- foto ----
  function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return toast.error("Foto maksimal 3MB")
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const skala = Math.min(1, 400 / img.width)
        canvas.width = Math.round(img.width * skala)
        canvas.height = Math.round(img.height * skala)
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setFoto(canvas.toDataURL("image/jpeg", 0.8))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // ---- kategori ----
  async function simpanKategori() {
    try {
      if (editKat) {
        await api(`/api/kategori/${editKat.id}`, { method: "PUT", json: { nama: namaKatBaru.trim() } })
        toast.success("Kategori diperbarui")
      } else {
        await api("/api/kategori", { method: "POST", json: { nama: namaKatBaru.trim() } })
        toast.success("Kategori ditambahkan")
      }
      setEditKat(null)
      setNamaKatBaru("")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kategori")
    }
  }

  async function hapusKategori(k: Kategori) {
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return
    try {
      await api(`/api/kategori/${k.id}`, { method: "DELETE" })
      toast.success("Kategori dihapus")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  // ---- resep ----
  async function bukaResep(m: Menu) {
    setResepMenu(m)
    try {
      const [rows, b] = await Promise.all([
        api<ResepRow[]>(`/api/resep?menuId=${m.id}`),
        api<BahanBaku[]>("/api/stok/bahan"),
      ])
      setResepRows(rows.map((r) => ({ bahanId: r.bahanId, qty: r.qty, bahan: r.bahan })))
      setBahan(b.filter((x) => x.aktif))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat resep")
    }
  }

  async function simpanResepMenu() {
    if (!resepMenu) return
    setSimpanResep(true)
    try {
      await api("/api/resep", {
        method: "PUT",
        json: { menuId: resepMenu.id, resep: resepRows.map((r) => ({ bahanId: r.bahanId, qty: Number(r.qty) })) },
      })
      toast.success("Resep disimpan")
      setResepMenu(null)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan resep")
    } finally {
      setSimpanResep(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Cari menu..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-52" />
        </div>
        <Select value={katFilter} onValueChange={setKatFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {kategori.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        {management && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setKatBuka(true)}>
              <Layers className="h-4 w-4 mr-1" /> Kategori
            </Button>
            <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white" onClick={() => {
              setFormMenu({ buka: true, edit: null })
              setNama(""); setKategoriId(""); setHarga(""); setDeskripsi(""); setFoto(null); setTersedia(true)
            }}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Menu
            </Button>
          </div>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              {management && <TableHead className="text-center">Resep</TableHead>}
              <TableHead className="text-center">Tersedia</TableHead>
              {management && <TableHead className="text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && menus.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Memuat...</TableCell></TableRow>
            )}
            {tampil.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-11 w-11 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {m.foto ? (
                         
                        <img src={m.foto} alt={m.nama} className="h-full w-full object-cover" />
                      ) : (
                        <Utensils className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{m.nama}</p>
                      <p className="text-xs text-slate-400">{m.kode}{!m.aktif && <Badge className="bg-slate-200 text-slate-600 border-0 ml-1 text-[10px]">nonaktif</Badge>}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">{m.kategori?.nama}</TableCell>
                <TableCell className="text-right font-semibold">{rupiah(m.harga)}</TableCell>
                {management && (
                  <TableCell className="text-center">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bukaResep(m)}>
                      <FlaskConical className="h-3 w-3 mr-1" /> {m.jumlahResep ?? 0}
                    </Button>
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Switch checked={m.tersedia} onCheckedChange={(v) => gantiTersedia(m, v)} />
                </TableCell>
                {management && (
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => {
                        setFormMenu({ buka: true, edit: m })
                        setNama(m.nama); setKategoriId(m.kategoriId); setHarga(String(m.harga))
                        setDeskripsi(m.deskripsi ?? ""); setFoto(m.foto); setTersedia(m.tersedia)
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => hapusMenu(m)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form menu */}
      <Dialog open={formMenu.buka} onOpenChange={(v) => setFormMenu((f) => ({ ...f, buka: v }))}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto thin-scroll">
          <DialogHeader>
            <DialogTitle>{formMenu.edit ? "Ubah Menu" : "Tambah Menu"}</DialogTitle>
            <DialogDescription>Kode menu dibuat otomatis oleh sistem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama Menu</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nasi Goreng Spesial" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={kategoriId} onValueChange={setKategoriId}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {kategori.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Harga (Rp)</Label>
                <Input type="number" min={0} value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="25000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Foto (opsional, maks 3MB)</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                  {foto ? (
                     
                    <img src={foto} alt="foto menu" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Input type="file" accept="image/*" onChange={pilihFoto} className="text-xs" />
                  {foto && (
                    <Button size="sm" variant="ghost" className="text-xs text-rose-600" onClick={() => setFoto(null)}>
                      <X className="h-3 w-3 mr-1" /> Hapus foto
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Tersedia di POS</p>
                <p className="text-xs text-slate-400">Matikan jika menu sold out hari ini</p>
              </div>
              <Switch checked={tersedia} onCheckedChange={setTersedia} />
            </div>
            <div className="flex gap-2">
              <Button onClick={simpanMenu} disabled={simpan} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
                {simpan ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" onClick={() => setFormMenu({ buka: false, edit: null })}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog kategori */}
      <Dialog open={katBuka} onOpenChange={setKatBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Kelola Kategori</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {kategori.map((k) => (
              <div key={k.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{k.nama}</p>
                  <p className="text-xs text-slate-400">{k._count?.menus ?? 0} menu</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditKat(k); setNamaKatBaru(k.nama) }}>Ubah</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600" onClick={() => hapusKategori(k)}>Hapus</Button>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2">
            <Label>{editKat ? `Ubah "${editKat.nama}"` : "Kategori baru"}</Label>
            <Input value={namaKatBaru} onChange={(e) => setNamaKatBaru(e.target.value)} placeholder="Nama kategori" />
            <div className="flex gap-2">
              <Button onClick={simpanKategori} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
                {editKat ? "Perbarui" : "Tambah"}
              </Button>
              {editKat && <Button variant="outline" onClick={() => { setEditKat(null); setNamaKatBaru("") }}>Batal Ubah</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog resep */}
      <Dialog open={!!resepMenu} onOpenChange={(v) => !v && setResepMenu(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto thin-scroll">
          <DialogHeader>
            <DialogTitle>Resep: {resepMenu?.nama}</DialogTitle>
            <DialogDescription>Bahan per 1 porsi. Stok otomatis dikurangi mengikuti resep ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {resepRows.map((r, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select
                  value={r.bahanId}
                  onValueChange={(v) => {
                    const rows = [...resepRows]
                    rows[idx] = { ...rows[idx], bahanId: v }
                    setResepRows(rows)
                  }}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih bahan" /></SelectTrigger>
                  <SelectContent>
                    {bahan.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.nama} ({b.satuan})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number" min={0.1} step="any"
                  value={r.qty}
                  onChange={(e) => {
                    const rows = [...resepRows]
                    rows[idx] = { ...rows[idx], qty: Number(e.target.value) }
                    setResepRows(rows)
                  }}
                  className="w-24"
                />
                <Button size="icon" variant="outline" className="h-9 w-9 text-rose-600" onClick={() => setResepRows(resepRows.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              size="sm" variant="outline"
              onClick={() => setResepRows([...resepRows, { bahanId: bahan[0]?.id ?? "", qty: 1 }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Bahan
            </Button>
            <div className="flex gap-2 pt-2">
              <Button onClick={simpanResepMenu} disabled={simpanResep} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
                {simpanResep ? "Menyimpan..." : "Simpan Resep"}
              </Button>
              <Button variant="outline" onClick={() => setResepMenu(null)}>Tutup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
