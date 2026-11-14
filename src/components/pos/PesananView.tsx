"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser, Pesanan, Settings } from "@/lib/types"
import { rupiah, tanggalJam, LABEL_STATUS, LABEL_TIPE, kelasBadgeStatus } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Eye, Printer, Wallet, Merge, CircleAlert, Plus, Minus,
} from "lucide-react"
import { toast } from "sonner"
import { StrukPesanan, KotPesanan } from "@/components/pos/StrukKot"

const STATUS_FILTER = [
  { key: "AKTIF", label: "Aktif" },
  { key: "", label: "Semua" },
  { key: "PENDING", label: "Baru" },
  { key: "PREPARING", label: "Dimasak" },
  { key: "READY", label: "Siap" },
  { key: "SERVED", label: "Disajikan" },
  { key: "COMPLETED", label: "Selesai" },
  { key: "CANCELLED", label: "Batal" },
]

export default function PesananView({ user }: { user: SessionUser }) {
  const [list, setList] = useState<Pesanan[]>([])
  const [filter, setFilter] = useState("AKTIF")
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  const [detail, setDetail] = useState<Pesanan | null>(null)
  const [detailBuka, setDetailBuka] = useState(false)

  const [bayarBuka, setBayarBuka] = useState(false)
  const [gabungBuka, setGabungBuka] = useState(false)
  const [batalBuka, setBatalBuka] = useState(false)
  const [alasanBatal, setAlasanBatal] = useState("")

  const [strukCetak, setStrukCetak] = useState<Pesanan | null>(null)
  const [kotCetak, setKotCetak] = useState<Pesanan | null>(null)

  // ---- edit item (PENDING) ----
  const [editItems, setEditItems] = useState<Record<string, number>>({})

  const muatList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set("status", filter)
      if (q.trim()) params.set("q", q.trim())
      const rows = await api<Pesanan[]>(`/api/pesanan?${params.toString()}`)
      setList(rows)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat pesanan")
    } finally {
      setLoading(false)
    }
  }, [filter, q])

  useEffect(() => { muatList() }, [muatList])

  async function bukaDetail(p: Pesanan) {
    try {
      const full = await api<Pesanan>(`/api/pesanan/${p.id}`)
      setDetail(full)
      setEditItems(Object.fromEntries((full.items ?? []).map((i) => [i.id, i.qty])))
      setDetailBuka(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat detail")
    }
  }

  async function refreshDetail(id: string) {
    const full = await api<Pesanan>(`/api/pesanan/${id}`)
    setDetail(full)
    muatList()
    return full
  }

  async function ubahStatus(id: string, aksi: string, alasan?: string) {
    try {
      await api(`/api/pesanan/${id}/status`, { method: "POST", json: { aksi, alasan } })
      toast.success(`Pesanan ${id}: ${aksi.toLowerCase()} berhasil`)
      if (detailBuka && detail?.id === id) await refreshDetail(id)
      else muatList()
      setBatalBuka(false)
      setAlasanBatal("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status")
    }
  }

  async function simpanEditItem() {
    if (!detail) return
    const items = (detail.items ?? []).map((i) => ({
      menuId: i.menuId,
      qty: editItems[i.id] ?? i.qty,
      catatan: i.catatan ?? undefined,
    }))
    try {
      await api(`/api/pesanan/${detail.id}`, { method: "PUT", json: { items } })
      toast.success("Item pesanan diperbarui")
      await refreshDetail(detail.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan perubahan")
    }
  }

  function cetakStruk(p: Pesanan) {
    setStrukCetak(p)
    setTimeout(() => window.print(), 200)
  }
  function cetakKot(p: Pesanan) {
    setKotCetak(p)
    setTimeout(() => window.print(), 200)
  }

  const sudahBayar = detail?.pembayarans?.reduce((s, b) => s + b.jumlah, 0) ?? 0
  const sisa = detail ? detail.total - sudahBayar : 0
  const bisaEdit = detail?.status === "PENDING" && sudahBayar === 0

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto thin-scroll pb-1">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.key || "semua"}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${
                filter === f.key ? "bg-[#1b2a5e] text-white border-[#1b2a5e]" : "bg-white text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Cari no. pesanan / pelanggan..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs sm:ml-auto"
        />
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <ScrollArea className="max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Pesanan</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Meja/Pelanggan</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && list.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Memuat...</TableCell></TableRow>
              )}
              {!loading && list.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Tidak ada pesanan.</TableCell></TableRow>
              )}
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.id}</TableCell>
                  <TableCell className="text-slate-500">{tanggalJam(p.createdAt)}</TableCell>
                  <TableCell>{LABEL_TIPE[p.tipe]}</TableCell>
                  <TableCell className="text-slate-500">{p.meja?.nama ?? p.namaPelanggan ?? "-"}</TableCell>
                  <TableCell className="text-right font-semibold">{rupiah(p.total)}</TableCell>
                  <TableCell><Badge className={`${kelasBadgeStatus(p.status)} border-0`}>{LABEL_STATUS[p.status]}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="outline" onClick={() => bukaDetail(p)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* ============ Dialog Detail ============ */}
      <Dialog open={detailBuka} onOpenChange={(v) => { setDetailBuka(v); if (!v) setDetail(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto thin-scroll">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detail.id}
                  <Badge className={`${kelasBadgeStatus(detail.status)} border-0`}>{LABEL_STATUS[detail.status]}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {LABEL_TIPE[detail.tipe]}
                  {detail.meja ? ` · ${detail.meja.nama}` : ""}
                  {detail.namaPelanggan ? ` · ${detail.namaPelanggan}` : ""}
                  {detail.kasir ? ` · Kasir: ${detail.kasir.nama}` : ""} · {tanggalJam(detail.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Items */}
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu</TableHead>
                      <TableHead className="w-28 text-center">Qty</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail.items ?? []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <p className="font-medium">{it.namaMenu}</p>
                          {it.catatan && <p className="text-xs italic text-[#c2410c]">&raquo; {it.catatan}</p>}
                          {it.bayarId && <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] mt-1">Sudah dibayar (split)</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          {bisaEdit && !it.bayarId ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button size="icon" variant="outline" className="h-6 w-6"
                                onClick={() => setEditItems((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] ?? it.qty) - 1) }))}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-semibold w-6">{editItems[it.id] ?? it.qty}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6"
                                onClick={() => setEditItems((prev) => ({ ...prev, [it.id]: (prev[it.id] ?? it.qty) + 1 }))}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            `${it.qty}×`
                          )}
                        </TableCell>
                        <TableCell className="text-right">{rupiah(it.harga * it.qty)}</TableCell>
                      </TableRow>
                    ))}
                    {bisaEdit && (detail.items ?? []).some((it) => !it.bayarId) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right">
                          <Button size="sm" onClick={simpanEditItem} className="bg-[#1b2a5e] hover:bg-[#14204a] text-white">
                            Simpan Perubahan Item
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><b>{rupiah(detail.subtotal)}</b></div>
                  <div className="flex justify-between"><span>Pajak {detail.pajakPersen}%</span><b>{rupiah(detail.pajakNominal)}</b></div>
                  <div className="flex justify-between"><span>Service {detail.servicePersen}%</span><b>{rupiah(detail.serviceNominal)}</b></div>
                  <Separator />
                  <div className="flex justify-between text-base"><b>TOTAL</b><b className="text-[#f97316]">{rupiah(detail.total)}</b></div>
                  <div className="flex justify-between"><span>Sudah dibayar</span><b className="text-emerald-700">{rupiah(sudahBayar)}</b></div>
                  <div className="flex justify-between"><span>Sisa</span><b className={sisa > 0 && detail.status !== "COMPLETED" ? "text-rose-600" : ""}>{rupiah(Math.max(0, sisa))}</b></div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1.5">Riwayat Pembayaran</p>
                  {(detail.pembayarans ?? []).length === 0 && <p className="text-sm text-slate-400">Belum ada pembayaran.</p>}
                  <div className="space-y-1.5">
                    {(detail.pembayarans ?? []).map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 border px-2.5 py-1.5">
                        <span className="font-medium">{b.metode}{b.referensi ? ` · ${b.referensi}` : ""}</span>
                        <span className="font-semibold">{rupiah(b.jumlah)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aksi */}
              <div className="flex flex-wrap gap-2 pt-1">
                {detail.status === "PENDING" && (
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => ubahStatus(detail.id, "MULAI")}>
                    Kirim ke Dapur (Mulai Masak)
                  </Button>
                )}
                {detail.status === "PREPARING" && (
                  <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={() => ubahStatus(detail.id, "SIAP")}>
                    Tandai Siap
                  </Button>
                )}
                {detail.status === "READY" && (
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => ubahStatus(detail.id, "SAJIKAN")}>
                    Sajikan
                  </Button>
                )}
                {["PENDING", "PREPARING", "READY", "SERVED"].includes(detail.status) && (
                  <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold" onClick={() => setBayarBuka(true)}>
                    <Wallet className="h-4 w-4 mr-1" /> Bayar
                  </Button>
                )}
                {["PENDING", "PREPARING", "READY", "SERVED"].includes(detail.status) && (
                  <Button size="sm" variant="outline" onClick={() => setGabungBuka(true)}>
                    <Merge className="h-4 w-4 mr-1" /> Gabung
                  </Button>
                )}
                {["PENDING", "PREPARING", "READY", "SERVED"].includes(detail.status) && (
                  <Button size="sm" variant="outline" onClick={() => cetakKot(detail)}>
                    <Printer className="h-4 w-4 mr-1" /> KOT
                  </Button>
                )}
                {detail.status === "COMPLETED" && (
                  <Button size="sm" className="bg-[#1b2a5e] hover:bg-[#14204a] text-white" onClick={() => cetakStruk(detail)}>
                    <Printer className="h-4 w-4 mr-1" /> Cetak Struk
                  </Button>
                )}
                {["PENDING", "PREPARING"].includes(detail.status) && sudahBayar === 0 && (
                  (user.role === "MANAGEMENT" || detail.kasirId === user.id) && (
                    <Button size="sm" variant="destructive" onClick={() => setBatalBuka(true)}>Batalkan</Button>
                  )
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Dialog Bayar ============ */}
      {detail && bayarBuka && (
        <BayarDialog
          pesanan={detail}
          onClose={() => setBayarBuka(false)}
          onSelesai={async (hasil) => {
            setBayarBuka(false)
            await refreshDetail(detail.id)
            if (hasil.lunas) {
              toast.success("Pembayaran lunas! Pesanan selesai.")
              const full = await api<Pesanan>(`/api/pesanan/${detail.id}`)
              cetakStruk(full)
            } else {
              toast.info(`Pembayaran dicatat. Sisa: ${rupiah(hasil.sisa)}`)
            }
          }}
        />
      )}

      {/* ============ Dialog Gabung ============ */}
      {detail && gabungBuka && (
        <GabungDialog
          target={detail}
          onClose={() => setGabungBuka(false)}
          onSelesai={async () => {
            setGabungBuka(false)
            await refreshDetail(detail.id)
          }}
        />
      )}

      {/* ============ Dialog Batal ============ */}
      <Dialog open={batalBuka} onOpenChange={setBatalBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Batalkan Pesanan {detail?.id}?</DialogTitle>
            <DialogDescription className="flex items-center gap-1">
              <CircleAlert className="h-4 w-4 text-amber-500" />
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Alasan pembatalan (opsional)" rows={2} value={alasanBatal} onChange={(e) => setAlasanBatal(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => detail && ubahStatus(detail.id, "BATAL", alasanBatal || undefined)}>
              Ya, Batalkan
            </Button>
            <Button variant="outline" onClick={() => setBatalBuka(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Area cetak ============ */}
      {strukCetak && <StrukPrintArea pesanan={strukCetak} onDone={() => setStrukCetak(null)} />}
      {kotCetak && (
        <div className="print-area">
          <KotPesanan pesanan={kotCetak} />
        </div>
      )}
    </div>
  )
}

/** Area cetak struk — memuat settings dulu lalu mencetak */
function StrukPrintArea({ pesanan, onDone }: { pesanan: Pesanan; onDone: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    api<Settings>("/api/pengaturan").then((s) => {
      setSettings(s)
      setTimeout(() => window.print(), 150)
      const done = () => onDone()
      window.addEventListener("afterprint", done, { once: true })
    })
  }, [pesanan.id, onDone])
  if (!settings) return null
  return (
    <div className="print-area">
      <StrukPesanan pesanan={pesanan} settings={settings} />
    </div>
  )
}

/* ================= Dialog Pembayaran ================= */
function BayarDialog({ pesanan, onClose, onSelesai }: {
  pesanan: Pesanan
  onClose: () => void
  onSelesai: (hasil: { lunas: boolean; sisa: number }) => void
}) {
  const [metode, setMetode] = useState("TUNAI")
  const [diterima, setDiterima] = useState("")
  const [referensi, setReferensi] = useState("")
  const [mode, setMode] = useState<"penuh" | "split">("penuh")
  const [submode, setSubmode] = useState<"item" | "jumlah">("item")
  const [pilihItem, setPilihItem] = useState<Set<string>>(new Set())
  const [jumlahSplit, setJumlahSplit] = useState("")
  const [loading, setLoading] = useState(false)

  const sudahBayar = pesanan.pembayarans?.reduce((s, b) => s + b.jumlah, 0) ?? 0
  const sisa = pesanan.total - sudahBayar
  const itemsSisa = (pesanan.items ?? []).filter((i) => !i.bayarId)

  // Porsi per item (proporsional pajak+service) untuk tampilan
  const porsi = useCallback((harga: number, qty: number) => {
    const dasar = harga * qty
    if (pesanan.subtotal <= 0) return dasar
    const pajak = Math.round((dasar / pesanan.subtotal) * pesanan.pajakNominal)
    const service = Math.round((dasar / pesanan.subtotal) * pesanan.serviceNominal)
    return dasar + pajak + service
  }, [pesanan.subtotal, pesanan.pajakNominal, pesanan.serviceNominal])

  const totalPilih = useMemo(
    () => itemsSisa.filter((i) => pilihItem.has(i.id)).reduce((s, i) => s + porsi(i.harga, i.qty), 0),
    [itemsSisa, pilihItem, porsi]
  )
  // Jika semua item sisa dipilih = bayar sisa penuh
  const semuaDipilih = itemsSisa.length > 0 && itemsSisa.every((i) => pilihItem.has(i.id))
  const jumlahTagihan = useMemo(() => {
    if (mode === "penuh") return sisa
    if (submode === "item") return semuaDipilih ? sisa : totalPilih
    return Math.min(Number(jumlahSplit) || 0, sisa)
  }, [mode, submode, sisa, totalPilih, jumlahSplit, semuaDipilih])

  const diterimaNum = Number(diterima) || 0
  const kembalian = metode === "TUNAI" && diterimaNum >= jumlahTagihan ? diterimaNum - jumlahTagihan : 0
  const kurangBayar = metode === "TUNAI" && diterimaNum < jumlahTagihan

  const tombolCepat = [jumlahTagihan, 50000, 100000, 200000, 500000]

  async function bayar() {
    setLoading(true)
    try {
      const json: Record<string, unknown> = { metode }
      if (mode === "split" && submode === "item") {
        json.itemIds = [...pilihItem]
      } else if (mode === "split" && submode === "jumlah") {
        json.jumlah = Number(jumlahSplit)
      }
      if (metode === "TUNAI") json.tunaiDiterima = diterimaNum
      if (referensi.trim()) json.referensi = referensi.trim()

      const hasil = await api<{ lunas: boolean; sisa: number; kembalian: number }>(
        `/api/pesanan/${pesanan.id}/bayar`,
        { method: "POST", json }
      )
      if (hasil.kembalian > 0) toast.success(`Kembalian: ${rupiah(hasil.kembalian)}`)
      onSelesai(hasil)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pembayaran gagal")
    } finally {
      setLoading(false)
    }
  }

  const tidakValid =
    loading ||
    jumlahTagihan <= 0 ||
    (mode === "split" && submode === "item" && pilihItem.size === 0) ||
    (metode === "TUNAI" && diterimaNum < jumlahTagihan)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle>Pembayaran — {pesanan.id}</DialogTitle>
          <DialogDescription>
            Total {rupiah(pesanan.total)} · Sudah dibayar {rupiah(sudahBayar)} ·
            <b className={sisa > 0 ? "text-rose-600" : "text-emerald-700"}> Sisa {rupiah(sisa)}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("penuh")}
            className={`py-2.5 rounded-xl text-sm font-bold border ${mode === "penuh" ? "bg-[#1b2a5e] text-white border-[#1b2a5e]" : "bg-white"}`}
          >
            Bayar Sisa Penuh
          </button>
          <button
            onClick={() => setMode("split")}
            className={`py-2.5 rounded-xl text-sm font-bold border ${mode === "split" ? "bg-[#1b2a5e] text-white border-[#1b2a5e]" : "bg-white"}`}
          >
            Split Bill
          </button>
        </div>

        {mode === "split" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSubmode("item")}
              className={`py-2 rounded-lg text-xs font-semibold border ${submode === "item" ? "bg-[#f97316] text-white border-[#f97316]" : "bg-white"}`}
            >
              Per Item
            </button>
            <button
              onClick={() => setSubmode("jumlah")}
              className={`py-2 rounded-lg text-xs font-semibold border ${submode === "jumlah" ? "bg-[#f97316] text-white border-[#f97316]" : "bg-white"}`}
            >
              Per Jumlah
            </button>
          </div>
        )}

        {mode === "split" && submode === "item" && (
          <div className="rounded-xl border max-h-52 overflow-y-auto thin-scroll divide-y">
            {itemsSisa.length === 0 && <p className="text-sm text-slate-400 p-3">Semua item sudah dibayar.</p>}
            {itemsSisa.map((i) => (
              <label key={i.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <Checkbox
                  checked={pilihItem.has(i.id)}
                  onCheckedChange={(v) => {
                    const baru = new Set(pilihItem)
                    if (v) baru.add(i.id)
                    else baru.delete(i.id)
                    setPilihItem(baru)
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{i.qty}× {i.namaMenu}</p>
                  {i.catatan && <p className="text-xs italic text-slate-500">{i.catatan}</p>}
                </div>
                <span className="text-sm font-semibold">{rupiah(porsi(i.harga, i.qty))}</span>
              </label>
            ))}
            <div className="flex justify-between px-3 py-2 bg-slate-50 text-sm font-bold">
              <span>Terpilih {semuaDipilih ? "(semua = lunas)" : ""}</span>
              <span className="text-[#f97316]">{rupiah(semuaDipilih ? sisa : totalPilih)}</span>
            </div>
          </div>
        )}

        {mode === "split" && submode === "jumlah" && (
          <div className="space-y-1.5">
            <Label>Jumlah dibayar sekarang (maks {rupiah(sisa)})</Label>
            <Input
              type="number" min={1} max={sisa} value={jumlahSplit}
              onChange={(e) => setJumlahSplit(e.target.value)}
              placeholder="0"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Metode Pembayaran</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {["TUNAI", "QRIS", "TRANSFER", "DEBIT"].map((m) => (
              <button
                key={m}
                onClick={() => setMetode(m)}
                className={`py-2 rounded-lg text-xs font-bold border ${metode === m ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {metode === "TUNAI" ? (
          <div className="space-y-2">
            <div className="flex justify-between rounded-xl bg-[#1b2a5e] text-white px-3 py-2.5">
              <span className="text-sm">Tagihan</span>
              <span className="font-bold">{rupiah(jumlahTagihan)}</span>
            </div>
            <div>
              <Label className="text-xs">Uang Diterima</Label>
              <Input type="number" min={0} value={diterima} onChange={(e) => setDiterima(e.target.value)} placeholder="0" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tombolCepat.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setDiterima(String(v))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white hover:bg-slate-50"
                >
                  {i === 0 ? "Pas" : rupiah(v)}
                </button>
              ))}
            </div>
            {kurangBayar && diterimaNum > 0 && (
              <p className="text-sm font-semibold text-rose-600">
                Uang kurang {rupiah(jumlahTagihan - diterimaNum)} — pembayaran diblokir.
              </p>
            )}
            {!kurangBayar && diterimaNum > 0 && (
              <p className="text-sm font-semibold text-emerald-700">Kembalian: {rupiah(kembalian)}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs">No. Referensi {metode} (opsional)</Label>
            <Input value={referensi} onChange={(e) => setReferensi(e.target.value)} placeholder="ID transaksi / approval code" />
            <p className="text-xs text-slate-400">Pembayaran {metode} dicatat manual dengan nominal tagihan.</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={bayar}
            disabled={tidakValid}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-bold"
          >
            {loading ? "Memproses..." : `Bayar ${rupiah(jumlahTagihan)}`}
          </Button>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= Dialog Gabung Bill ================= */
function GabungDialog({ target, onClose, onSelesai }: {
  target: Pesanan
  onClose: () => void
  onSelesai: () => void
}) {
  const [aktif, setAktif] = useState<Pesanan[]>([])
  const [pilih, setPilih] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<Pesanan[]>("/api/pesanan?status=AKTIF&limit=50").then((rows) => {
      setAktif(rows.filter((r) => r.id !== target.id))
    })
  }, [target.id])

  async function gabung() {
    setLoading(true)
    try {
      await api("/api/pesanan/gabung", { method: "POST", json: { targetId: target.id, sourceIds: [...pilih] } })
      toast.success("Pesanan berhasil digabung")
      onSelesai()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menggabungkan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gabung ke {target.id}</DialogTitle>
          <DialogDescription>
            Pilih pesanan aktif lain untuk digabung ke pesanan ini. Pesanan sumber harus belum memiliki pembayaran.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border max-h-60 overflow-y-auto thin-scroll divide-y">
          {aktif.length === 0 && <p className="text-sm text-slate-400 p-3">Tidak ada pesanan aktif lain.</p>}
          {aktif.map((p) => (
            <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
              <Checkbox
                checked={pilih.has(p.id)}
                onCheckedChange={(v) => {
                  const baru = new Set(pilih)
                  if (v) baru.add(p.id)
                  else baru.delete(p.id)
                  setPilih(baru)
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.id}</p>
                <p className="text-xs text-slate-400">
                  {LABEL_TIPE[p.tipe]}{p.meja ? ` · ${p.meja.nama}` : ""} · {rupiah(p.total)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={gabung} disabled={pilih.size === 0 || loading} className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white">
            {loading ? "Menggabung..." : `Gabung ${pilih.size} Pesanan`}
          </Button>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
