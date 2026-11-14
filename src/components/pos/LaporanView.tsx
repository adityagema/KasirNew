"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { LaporanData } from "@/lib/types"
import { rupiah, angka, tanggalJam, ymdHariIni, LABEL_TIPE } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Download, Printer, Search, Wallet, ReceiptText, Percent, TrendingUp } from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"
import { toast } from "sonner"

export default function LaporanView() {
  const [dari, setDari] = useState(ymdHariIni())
  const [sampai, setSampai] = useState(ymdHariIni())
  const [data, setData] = useState<LaporanData | null>(null)
  const [loading, setLoading] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<LaporanData>(`/api/laporan?dari=${dari}&sampai=${sampai}`)
      setData(d)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }, [dari, sampai])

  useEffect(() => { muat() }, [muat])

  function unduhCsv() {
    if (!data) return
    const header = ["No.Pesanan", "Tanggal", "Tipe", "Meja", "Kasir", "Subtotal", "Pajak", "Service", "Total", "Metode", "Item"]
    const baris = data.rinci.map((r) => [
      r.id, tanggalJam(r.tanggal), r.tipe, r.meja ?? "-", r.kasir,
      r.subtotal, r.pajak, r.service, r.total, r.metode, r.jumlahItem,
    ])
    const csv = [header, ...baris].map((b) => b.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `laporan-${dari}-${sampai}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV diunduh")
  }

  function cetak() {
    setTimeout(() => window.print(), 150)
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border p-4">
        <div className="space-y-1">
          <Label className="text-xs">Dari</Label>
          <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampai</Label>
          <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
        </div>
        <Button onClick={muat} disabled={loading} className="bg-[#1b2a5e] hover:bg-[#14204a] text-white">
          <Search className="h-4 w-4 mr-1" /> {loading ? "Memuat..." : "Tampilkan"}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={unduhCsv} disabled={!data}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" onClick={cetak} disabled={!data}>
            <Printer className="h-4 w-4 mr-1" /> Cetak
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Kartu ringkasan */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-slate-500">Total Omzet</p>
                <p className="text-lg font-bold">{rupiah(data.ringkasan.omzet)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><ReceiptText className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-slate-500">Transaksi</p>
                <p className="text-lg font-bold">{data.ringkasan.transaksi}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-slate-500">Rata-rata / Transaksi</p>
                <p className="text-lg font-bold">{rupiah(data.ringkasan.rataRata)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><Percent className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-slate-500">Pajak + Service</p>
                <p className="text-lg font-bold">{rupiah(data.ringkasan.totalPajak + data.ringkasan.totalService)}</p>
              </div>
            </div>
          </div>

          {/* Grafik */}
          {data.grafik.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <p className="font-semibold text-[#1b2a5e] mb-3">Omzet per Hari</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.grafik}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
                    <XAxis dataKey="tanggal" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => `${(v / 1000).toLocaleString("id-ID")}rb`}
                    />
                    <Tooltip formatter={(v: number | string) => rupiah(Number(v))} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="omzet" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per metode & tipe */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-xl border p-4">
              <p className="font-semibold text-[#1b2a5e] mb-2">Per Metode Pembayaran</p>
              <div className="space-y-1.5">
                {Object.entries(data.perMetode).length === 0 && <p className="text-sm text-slate-400">Tidak ada data.</p>}
                {Object.entries(data.perMetode).map(([m, v]) => (
                  <div key={m} className="flex justify-between text-sm border-b pb-1">
                    <span>{m} ({v.jumlah}×)</span><b>{rupiah(v.nominal)}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="font-semibold text-[#1b2a5e] mb-2">Per Tipe Pesanan</p>
              <div className="space-y-1.5">
                {Object.entries(data.perTipe).length === 0 && <p className="text-sm text-slate-400">Tidak ada data.</p>}
                {Object.entries(data.perTipe).map(([t, v]) => (
                  <div key={t} className="flex justify-between text-sm border-b pb-1">
                    <span>{LABEL_TIPE[t] ?? t} ({v.jumlah}×)</span><b>{rupiah(v.nominal)}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kategori & Top menu */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-xl border p-4">
              <p className="font-semibold text-[#1b2a5e] mb-2">Penjualan per Kategori</p>
              <div className="space-y-1.5">
                {Object.entries(data.perKategori).length === 0 && <p className="text-sm text-slate-400">Tidak ada data.</p>}
                {Object.entries(data.perKategori).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b pb-1">
                    <span>{k} ({v.qty} item)</span><b>{rupiah(v.nominal)}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="font-semibold text-[#1b2a5e] mb-2">Menu Terlaris</p>
              <div className="space-y-1.5">
                {data.topMenu.length === 0 && <p className="text-sm text-slate-400">Tidak ada data.</p>}
                {data.topMenu.slice(0, 10).map((m, i) => (
                  <div key={m.nama} className="flex justify-between text-sm border-b pb-1">
                    <span>{i + 1}. {m.nama} ({m.qty}×)</span><b>{rupiah(m.nominal)}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rincian transaksi */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <p className="font-semibold text-[#1b2a5e] p-4 pb-2">Rincian Transaksi ({data.rinci.length})</p>
            <div className="max-h-96 overflow-y-auto thin-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kasir</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rinci.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-6">Belum ada transaksi selesai pada periode ini.</TableCell></TableRow>
                  )}
                  {data.rinci.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.id}</TableCell>
                      <TableCell className="text-slate-500">{tanggalJam(r.tanggal)}</TableCell>
                      <TableCell>{LABEL_TIPE[r.tipe]}{r.meja ? ` · ${r.meja}` : ""}</TableCell>
                      <TableCell>{r.kasir}</TableCell>
                      <TableCell><Badge variant="outline">{r.metode}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{rupiah(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Area cetak laporan */}
      {data && (
        <div className="print-area struk-80" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
          <p style={{ fontWeight: 700, textAlign: "center", fontSize: "1.2em" }}>LAPORAN PENJUALAN</p>
          <p style={{ textAlign: "center" }}>Periode: {data.periode.dari} s/d {data.periode.sampai}</p>
          <div className="struk-garis" />
          <div className="struk-baris"><span>Omzet</span><span>{rupiah(data.ringkasan.omzet)}</span></div>
          <div className="struk-baris"><span>Transaksi</span><span>{data.ringkasan.transaksi}</span></div>
          <div className="struk-baris"><span>Rata-rata</span><span>{rupiah(data.ringkasan.rataRata)}</span></div>
          <div className="struk-baris"><span>Pajak</span><span>{rupiah(data.ringkasan.totalPajak)}</span></div>
          <div className="struk-baris"><span>Service</span><span>{rupiah(data.ringkasan.totalService)}</span></div>
          <div className="struk-garis" />
          {Object.entries(data.perMetode).map(([m, v]) => (
            <div key={m} className="struk-baris"><span>{m}</span><span>{rupiah(v.nominal)}</span></div>
          ))}
          <div className="struk-garis" />
          {data.topMenu.slice(0, 10).map((m) => (
            <div key={m.nama} className="struk-baris"><span>{m.nama}</span><span>{m.qty}x {rupiah(m.nominal)}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}
