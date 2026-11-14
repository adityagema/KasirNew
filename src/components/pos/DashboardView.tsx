"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { DashMgmt, DashKasir, SessionUser, Pesanan } from "@/lib/types"
import { rupiah, waktu, LABEL_STATUS, LABEL_TIPE, kelasBadgeStatus } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wallet, ReceiptText, CookingPot, Armchair, TrendingUp, Package, UtensilsCrossed,
} from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"

function Kartu({ judul, nilai, sub, icon: Icon, warna }: {
  judul: string
  nilai: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  warna: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${warna}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{judul}</p>
          <p className="text-lg font-bold text-slate-800 truncate">{nilai}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function BadgeStatus({ status }: { status: string }) {
  return <Badge className={`${kelasBadgeStatus(status)} border-0`}>{LABEL_STATUS[status] ?? status}</Badge>
}

function BarisPesanan({ list, kosong }: { list: Pesanan[]; kosong: string }) {
  if (list.length === 0) return <p className="text-sm text-slate-400 p-4">{kosong}</p>
  return (
    <div className="divide-y divide-slate-100">
      {list.map((p) => (
        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-700">{p.id}</p>
            <p className="text-xs text-slate-400 truncate">
              {waktu(p.createdAt)} · {LABEL_TIPE[p.tipe]}
              {p.meja ? ` · ${p.meja.nama}` : p.namaPelanggan ? ` · ${p.namaPelanggan}` : ""}
              {p.kasir ? ` · ${p.kasir.nama}` : ""}
            </p>
          </div>
          <span className="font-semibold text-slate-700 whitespace-nowrap">{rupiah(p.total)}</span>
          <BadgeStatus status={p.status} />
        </div>
      ))}
    </div>
  )
}

export default function DashboardView({ user }: { user: SessionUser }) {
  const [mgmt, setMgmt] = useState<DashMgmt | null>(null)
  const [kasir, setKasir] = useState<DashKasir | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<DashMgmt | DashKasir>("/api/dashboard")
      if (data.peran === "MANAGEMENT") setMgmt(data as DashMgmt)
      else setKasir(data as DashKasir)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
    const t = setInterval(muat, 30000)
    return () => clearInterval(t)
  }, [muat])

  if (loading && !mgmt && !kasir) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  // ---------- DASHBOARD KASIR ----------
  if (kasir) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Kartu judul="Transaksi Saya Hari Ini" nilai={String(kasir.kartu.transaksiSaya)} icon={ReceiptText} warna="bg-emerald-100 text-emerald-700" />
          <Kartu judul="Omzet Saya Hari Ini" nilai={rupiah(kasir.kartu.omzetSaya)} icon={Wallet} warna="bg-orange-100 text-orange-700" />
          <Kartu judul="Pesanan Aktif" nilai={String(kasir.kartu.pesananAktif)} icon={CookingPot} warna="bg-amber-100 text-amber-700" />
          <Kartu judul="Meja Tersedia" nilai={`${kasir.kartu.mejaKosong} / ${kasir.kartu.totalMeja}`} icon={Armchair} warna="bg-sky-100 text-sky-700" />
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">8 Pesanan Terakhir Saya</CardTitle></CardHeader>
          <BarisPesanan list={kasir.pesananTerakhir} kosong="Belum ada pesanan hari ini. Mulai dari POS Kasir!" />
        </Card>

        <p className="text-xs text-slate-400">
          Pajak {kasir.kartu.pajakPersen}% · Service {kasir.kartu.servicePersen}% otomatis dihitung saat pembayaran.
        </p>
      </div>
    )
  }

  // ---------- DASHBOARD MANAGEMENT ----------
  if (mgmt) {
    const grafik = mgmt.grafik
    return (
      <div className="space-y-5">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Kartu judul="Omzet Hari Ini" nilai={rupiah(mgmt.kartu.omzetHariIni)} sub={`${mgmt.kartu.transaksiHariIni} transaksi`} icon={Wallet} warna="bg-orange-100 text-orange-700" />
          <Kartu judul="Pesanan Aktif" nilai={String(mgmt.kartu.pesananAktif)} sub="sedang berjalan" icon={CookingPot} warna="bg-amber-100 text-amber-700" />
          <Kartu judul="Meja Terisi" nilai={`${mgmt.kartu.mejaTerisi} / ${mgmt.kartu.totalMeja}`} icon={Armchair} warna="bg-sky-100 text-sky-700" />
          <Kartu judul="Menu Aktif" nilai={String(mgmt.kartu.totalMenu)} icon={UtensilsCrossed} warna="bg-violet-100 text-violet-700" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#f97316]" /> Omzet 14 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={grafik} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" />
                    <XAxis dataKey="tanggal" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => `${(v / 1000).toLocaleString("id-ID")}rb`}
                    />
                    <Tooltip
                      formatter={(v: number | string) => [rupiah(Number(v)), "Omzet"]}
                      labelFormatter={(l) => `Tanggal ${l}`}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Area type="monotone" dataKey="omzet" stroke="#f97316" strokeWidth={2.5} fill="url(#omzetGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 Menu (30 hari)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {mgmt.top5.length === 0 && <p className="text-sm text-slate-400">Belum ada penjualan.</p>}
              {mgmt.top5.map((m, i) => (
                <div key={m.nama} className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-lg bg-[#1b2a5e] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.nama}</p>
                    <p className="text-xs text-slate-400">{m.qty} terjual · {rupiah(m.omzet)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-[#f97316]" /> Stok Menipis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mgmt.stokMenipis.length === 0 && <p className="text-sm text-slate-400">Semua stok aman.</p>}
              {mgmt.stokMenipis.map((b) => (
                <div key={b.nama} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{b.nama}</span>
                  <span className={`font-semibold ${b.menipis ? "text-rose-600" : "text-slate-500"}`}>
                    {b.stok} {b.satuan} {b.menipis && "⚠ (min " + b.minStok + ")"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Transaksi Terakhir</CardTitle></CardHeader>
            <BarisPesanan list={mgmt.transaksiTerakhir} kosong="Belum ada transaksi." />
          </Card>
        </div>
      </div>
    )
  }

  return null
}
