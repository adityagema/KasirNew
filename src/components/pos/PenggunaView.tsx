"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { PenggunaRow } from "@/lib/types"
import { tanggalJam } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function PenggunaView() {
  const [list, setList] = useState<PenggunaRow[]>([])
  const [loading, setLoading] = useState(true)

  const [formBuka, setFormBuka] = useState(false)
  const [edit, setEdit] = useState<PenggunaRow | null>(null)
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("KASIR")
  const [password, setPassword] = useState("")
  const [aktif, setAktif] = useState(true)
  const [simpan, setSimpan] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      setList(await api<PenggunaRow[]>("/api/pengguna"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat pengguna")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { muat() }, [muat])

  function bukaForm(u?: PenggunaRow) {
    setEdit(u ?? null)
    setNama(u?.nama ?? "")
    setEmail(u?.email ?? "")
    setRole(u?.role ?? "KASIR")
    setPassword("")
    setAktif(u?.aktif ?? true)
    setFormBuka(true)
  }

  async function simpanUser() {
    setSimpan(true)
    try {
      if (edit) {
        const json: Record<string, unknown> = { nama, role, aktif }
        if (password) json.passwordBaru = password
        await api(`/api/pengguna/${edit.id}`, { method: "PUT", json })
        toast.success("Pengguna diperbarui")
      } else {
        if (!password || password.length < 6) throw new Error("Password minimal 6 karakter")
        await api("/api/pengguna", { method: "POST", json: { nama, email, role, password, aktif } })
        toast.success("Pengguna ditambahkan")
      }
      setFormBuka(false)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setSimpan(false)
    }
  }

  async function hapusUser(u: PenggunaRow) {
    if (!confirm(`Hapus/nonaktifkan "${u.nama}"?`)) return
    try {
      const hasil = await api<{ deleted: boolean; deactivated?: boolean }>(`/api/pengguna/${u.id}`, { method: "DELETE" })
      toast.success(hasil.deleted ? "Pengguna dihapus" : "Pengguna dinonaktifkan (punya riwayat pesanan)")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  async function toggleAktif(u: PenggunaRow, v: boolean) {
    try {
      await api(`/api/pengguna/${u.id}`, { method: "PUT", json: { aktif: v } })
      toast.success(`${u.nama} ${v ? "diaktifkan" : "dinonaktifkan"}${v ? "" : " & dipaksa logout"}`)
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white" onClick={() => bukaForm()}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Pengguna
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="text-center">Aktif</TableHead>
              <TableHead className="text-center">Sesi Login</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && list.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Memuat...</TableCell></TableRow>
            )}
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold">{u.nama}</TableCell>
                <TableCell className="text-slate-500">{u.email}</TableCell>
                <TableCell>
                  <Badge className={u.role === "MANAGEMENT" ? "bg-[#1b2a5e] text-white border-0" : "bg-orange-100 text-orange-800 border-0"}>
                    {u.role === "MANAGEMENT" ? "Manajemen" : "Kasir"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={u.aktif} onCheckedChange={(v) => toggleAktif(u, v)} />
                </TableCell>
                <TableCell className="text-center">{u.sesiAktif ?? 0}</TableCell>
                <TableCell className="text-slate-500 text-sm">{tanggalJam(u.createdAt)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bukaForm(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-rose-600" onClick={() => hapusUser(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formBuka} onOpenChange={setFormBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{edit ? `Ubah: ${edit.nama}` : "Tambah Pengguna"}</DialogTitle>
            <DialogDescription>
              {edit ? "Isi password baru untuk reset password (memaksa logout semua sesi)." : "Kasir hanya dapat mengakses fitur kasir."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nama</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} /></div>
            {!edit && (
              <div className="space-y-1.5"><Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peran</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGEMENT">Manajemen</SelectItem>
                    <SelectItem value="KASIR">Kasir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{edit ? "Password Baru (opsional)" : "Password"}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 karakter" />
              </div>
            </div>
            {edit && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm font-medium">Akun Aktif</p>
                <Switch checked={aktif} onCheckedChange={setAktif} />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={simpanUser} disabled={simpan} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
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
