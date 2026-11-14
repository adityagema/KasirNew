"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser, Menu, Kategori, Meja, Settings, Pesanan } from "@/lib/types"
import { rupiah } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Minus, Trash2, StickyNote, Search, ShoppingCart, Printer, X,
} from "lucide-react"
import { toast } from "sonner"
import { KotPesanan } from "@/components/pos/StrukKot"

interface ItemKeranjang {
  menuId: string
  nama: string
  harga: number
  qty: number
  catatan: string
}

type TipePesanan = "DINE_IN" | "TAKE_AWAY" | "DELIVERY"

export default function POSView({ user }: { user: SessionUser }) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [kategori, setKategori] = useState<Kategori[]>([])
  const [meja, setMeja] = useState<Meja[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [q, setQ] = useState("")
  const [katAktif, setKatAktif] = useState("")

  const [cart, setCart] = useState<ItemKeranjang[]>([])
  const [tipe, setTipe] = useState<TipePesanan>("DINE_IN")
  const [mejaId, setMejaId] = useState("")
  const [namaPelanggan, setNamaPelanggan] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [catatanUmum, setCatatanUmum] = useState("")

  const [catatanMenu, setCatatanMenu] = useState<ItemKeranjang | null>(null)
  const [teksCatatan, setTeksCatatan] = useState("")
  const [kirim, setKirim] = useState(false)
  const [hasilPesanan, setHasilPesanan] = useState<Pesanan | null>(null)
  const [cetakKot, setCetakKot] = useState(false)

  const muat = useCallback(async () => {
    try {
      const [m, k, mj, s] = await Promise.all([
        api<Menu[]>("/api/menu"),
        api<Kategori[]>("/api/kategori"),
        api<Meja[]>("/api/meja"),
        api<Settings>("/api/pengaturan"),
      ])
      setMenus(m)
      setKategori(k)
      setMeja(mj)
      setSettings(s)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data POS")
    }
  }, [])

  useEffect(() => { muat() }, [muat])

  const menuTampil = useMemo(() => {
    const kata = q.toLowerCase()
    return menus.filter(
      (m) =>
        (!katAktif || m.kategoriId === katAktif) &&
        (!kata || m.nama.toLowerCase().includes(kata) || m.kode.toLowerCase().includes(kata))
    )
  }, [menus, q, katAktif])

  function tambah(m: Menu) {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuId === m.id && !c.catatan)
      if (idx >= 0) {
        const baru = [...prev]
        baru[idx] = { ...baru[idx], qty: baru[idx].qty + 1 }
        return baru
      }
      return [...prev, { menuId: m.id, nama: m.nama, harga: m.harga, qty: 1, catatan: "" }]
    })
  }

  function ubahQty(menuId: string, delta: number, catatan?: string) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuId === menuId && (catatan === undefined || c.catatan === catatan)
            ? { ...c, qty: c.qty + delta }
            : c
        )
        .filter((c) => c.qty > 0)
    )
  }

  function hapusItem(menuId: string, catatan: string) {
    setCart((prev) => prev.filter((c) => !(c.menuId === menuId && c.catatan === catatan)))
  }

  const subtotal = cart.reduce((s, c) => s + c.harga * c.qty, 0)
  const pajak = settings ? Math.round((subtotal * (Number(settings.PAJAK_PERSEN) || 0)) / 100) : 0
  const service = settings ? Math.round((subtotal * (Number(settings.SERVICE_PERSEN) || 0)) / 100) : 0
  const total = subtotal + pajak + service

  const mejaKosong = meja.filter((m) => m.status === "KOSONG")

  async function simpanPesanan() {
    if (cart.length === 0) return toast.error("Keranjang masih kosong")
    if (tipe === "DINE_IN" && !mejaId) return toast.error("Pesanan Dine In wajib memilih meja")
    if (tipe === "DELIVERY" && !namaPelanggan.trim()) return toast.error("Nama pelanggan wajib untuk Delivery")
    setKirim(true)
    try {
      const pesanan = await api<Pesanan>("/api/pesanan", {
        method: "POST",
        json: {
          tipe,
          mejaId: tipe === "DINE_IN" ? mejaId : undefined,
          namaPelanggan: namaPelanggan.trim() || undefined,
          telepon: telepon.trim() || undefined,
          alamat: alamat.trim() || undefined,
          catatan: catatanUmum.trim() || undefined,
          items: cart.map((c) => ({ menuId: c.menuId, qty: c.qty, catatan: c.catatan || undefined })),
        },
      })
      toast.success(`Pesanan ${pesanan.id} dikirim ke dapur`)
      setHasilPesanan(pesanan)
      setCart([])
      setNamaPelanggan("")
      setTelepon("")
      setAlamat("")
      setCatatanUmum("")
      setMejaId("")
      muat()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pesanan")
    } finally {
      setKirim(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
      {/* ---------- Panel kiri: daftar menu ---------- */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari menu atau kode..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto thin-scroll pb-1">
          <button
            onClick={() => setKatAktif("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${
              katAktif === "" ? "bg-[#1b2a5e] text-white border-[#1b2a5e]" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua
          </button>
          {kategori.map((k) => (
            <button
              key={k.id}
              onClick={() => setKatAktif(k.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${
                katAktif === k.id ? "bg-[#1b2a5e] text-white border-[#1b2a5e]" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {k.nama}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {menuTampil.length === 0 && (
            <p className="text-sm text-slate-400 col-span-full">Tidak ada menu ditemukan.</p>
          )}
          {menuTampil.map((m) => {
            const habis = !m.tersedia
            return (
              <button
                key={m.id}
                onClick={() => !habis && tambah(m)}
                disabled={habis}
                className={`text-left rounded-xl border bg-white overflow-hidden transition ${
                  habis
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-[#f97316] hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <div className="aspect-[4/3] bg-slate-100 relative flex items-center justify-center overflow-hidden">
                  {m.foto ? (
                     
                    <img src={m.foto} alt={m.nama} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🍽️</span>
                  )}
                  {habis && (
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Badge className="bg-rose-600 border-0">Habis / Sold Out</Badge>
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{m.nama}</p>
                  <p className="text-xs text-slate-400">{m.kode}</p>
                  <p className="text-sm font-bold text-[#f97316] mt-1">{rupiah(m.harga)}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- Panel kanan: keranjang ---------- */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#1b2a5e]" />
            <h2 className="font-bold text-[#1b2a5e]">Keranjang</h2>
            {cart.length > 0 && (
              <Badge className="bg-[#f97316] border-0 ml-auto">{cart.reduce((s, c) => s + c.qty, 0)} item</Badge>
            )}
          </div>

          {/* Tipe pesanan */}
          <div className="grid grid-cols-3 gap-1.5">
            {(["DINE_IN", "TAKE_AWAY", "DELIVERY"] as TipePesanan[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipe(t)}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  tipe === t
                    ? "bg-[#1b2a5e] text-white border-[#1b2a5e]"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "DINE_IN" ? "DINE IN" : t === "TAKE_AWAY" ? "TAKE AWAY" : "DELIVERY"}
              </button>
            ))}
          </div>

          {tipe === "DINE_IN" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Meja (wajib)</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {mejaKosong.length === 0 && (
                  <p className="col-span-full text-xs text-rose-600">Tidak ada meja kosong!</p>
                )}
                {mejaKosong.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMejaId(m.id)}
                    className={`py-2 rounded-lg text-[11px] font-semibold border text-center ${
                      mejaId === m.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 hover:bg-emerald-50"
                    }`}
                  >
                    {m.nama.replace("Meja ", "M").replace("Lesehan ", "L")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tipe === "TAKE_AWAY" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Pelanggan (opsional)</Label>
              <Input placeholder="Nama" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} />
            </div>
          )}

          {tipe === "DELIVERY" && (
            <div className="space-y-1.5">
              <Input placeholder="Nama pelanggan *" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} />
              <Input placeholder="No. telepon" value={telepon} onChange={(e) => setTelepon(e.target.value)} />
              <Textarea placeholder="Alamat pengiriman" rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
            </div>
          )}

          {/* Item keranjang */}
          <div className="max-h-72 overflow-y-auto thin-scroll space-y-2 -mx-1 px-1">
            {cart.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">Klik menu untuk menambah ke keranjang</p>
            )}
            {cart.map((c) => (
              <div key={c.menuId + "|" + c.catatan} className="rounded-lg border bg-slate-50 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{c.nama}</p>
                    <p className="text-xs text-slate-500">{rupiah(c.harga)} × {c.qty} = <b>{rupiah(c.harga * c.qty)}</b></p>
                    {c.catatan && <p className="text-xs italic text-[#c2410c] mt-0.5">&raquo; {c.catatan}</p>}
                  </div>
                  <button
                    aria-label="Hapus item"
                    onClick={() => hapusItem(c.menuId, c.catatan)}
                    className="text-slate-300 hover:text-rose-500 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahQty(c.menuId, -1, c.catatan)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm font-bold w-6 text-center">{c.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahQty(c.menuId, 1, c.catatan)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-500 ml-1"
                    onClick={() => {
                      setCatatanMenu(c)
                      setTeksCatatan(c.catatan)
                    }}
                  >
                    <StickyNote className="h-3.5 w-3.5 mr-1" />
                    Catatan
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Catatan umum (opsional)..."
            rows={1}
            value={catatanUmum}
            onChange={(e) => setCatatanUmum(e.target.value)}
          />

          {/* Totals */}
          <div className="rounded-xl bg-[#1b2a5e] text-white p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(subtotal)}</span></div>
            <div className="flex justify-between">
              <span>Pajak {settings?.PAJAK_PERSEN ?? 0}%</span><span>{rupiah(pajak)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service {settings?.SERVICE_PERSEN ?? 0}%</span><span>{rupiah(service)}</span>
            </div>
            <div className="border-t border-white/20 pt-1.5 flex justify-between font-bold text-base">
              <span>TOTAL</span><span className="text-[#f9b27a]">{rupiah(total)}</span>
            </div>
          </div>

          <Button
            onClick={simpanPesanan}
            disabled={kirim || cart.length === 0}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white h-12 text-base font-bold"
          >
            {kirim ? "Mengirim..." : "Kirim ke Dapur"}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog catatan item */}
      <Dialog open={!!catatanMenu} onOpenChange={(v) => !v && setCatatanMenu(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catatan: {catatanMenu?.nama}</DialogTitle>
            <DialogDescription>Contoh: tidak pakai bawang, pedas, tanpa es</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={teksCatatan} onChange={(e) => setTeksCatatan(e.target.value)} placeholder="Tulis catatan..." />
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white"
              onClick={() => {
                if (catatanMenu) {
                  hapusItem(catatanMenu.menuId, catatanMenu.catatan)
                  if (teksCatatan.trim()) {
                    setCart((prev) => {
                      const idx = prev.findIndex((c) => c.menuId === catatanMenu.menuId && c.catatan === teksCatatan.trim())
                      if (idx >= 0) {
                        const baru = [...prev]
                        baru[idx] = { ...baru[idx], qty: baru[idx].qty + catatanMenu.qty }
                        return baru
                      }
                      return [...prev, { ...catatanMenu, catatan: teksCatatan.trim() }]
                    })
                  }
                }
                setCatatanMenu(null)
              }}
            >
              Simpan
            </Button>
            <Button variant="outline" onClick={() => setCatatanMenu(null)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog sukses + cetak KOT */}
      <Dialog open={!!hasilPesanan} onOpenChange={(v) => !v && setHasilPesanan(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-700">Pesanan Berhasil Dibuat</DialogTitle>
            <DialogDescription>{hasilPesanan?.id}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-[#1b2a5e] hover:bg-[#14204a] text-white"
              onClick={() => {
                setCetakKot(true)
                setTimeout(() => window.print(), 150)
              }}
            >
              <Printer className="h-4 w-4 mr-2" /> Cetak KOT
            </Button>
            <Button variant="outline" onClick={() => setHasilPesanan(null)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Area cetak KOT */}
      {cetakKot && hasilPesanan && (
        <div className="print-area">
          <KotPesanan pesanan={hasilPesanan} />
        </div>
      )}
    </div>
  )
}
