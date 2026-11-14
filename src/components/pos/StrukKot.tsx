"use client"

import type { Pesanan, Settings } from "@/lib/types"
import { rupiah, waktu, LABEL_TIPE } from "@/lib/format"

/** Struk pembayaran 58/80 mm — dipakai di dalam .print-area */
export function StrukPesanan({ pesanan, settings }: { pesanan: Pesanan; settings: Settings }) {
  const ukuran = settings.STRUK_UKURAN === "58" ? "struk-58" : "struk-80"
  const sudahBayar = (pesanan.pembayarans ?? []).reduce((s, p) => s + p.jumlah, 0)
  const lunas = sudahBayar >= pesanan.total && pesanan.status === "COMPLETED"

  return (
    <div className={ukuran}>
      <div className="struk-tengah">
        <p style={{ fontWeight: 700, fontSize: "1.15em" }}>{settings.NAMA_RESTORAN}</p>
        <p>{settings.ALAMAT}</p>
        <p>Telp: {settings.TELEPON}</p>
      </div>
      <div className="struk-garis" />
      <p>{pesanan.id}</p>
      <div className="struk-baris"><span>Waktu</span><span>{waktu(pesanan.createdAt)}</span></div>
      <div className="struk-baris">
        <span>Tipe</span>
        <span>{LABEL_TIPE[pesanan.tipe]}{pesanan.meja ? ` - ${pesanan.meja.nama}` : pesanan.namaPelanggan ? ` - ${pesanan.namaPelanggan}` : ""}</span>
      </div>
      <div className="struk-baris"><span>Kasir</span><span>{pesanan.kasir?.nama ?? "-"}</span></div>
      <div className="struk-garis" />
      {(pesanan.items ?? []).map((it) => (
        <div key={it.id} style={{ marginBottom: 2 }}>
          <div className="struk-baris">
            <span style={{ maxWidth: "60%" }}>{it.qty}x {it.namaMenu}</span>
            <span>{rupiah(it.harga * it.qty)}</span>
          </div>
          {it.catatan && <p style={{ fontSize: "0.9em", fontStyle: "italic" }}>   &raquo; {it.catatan}</p>}
        </div>
      ))}
      <div className="struk-garis" />
      <div className="struk-baris"><span>Subtotal</span><span>{rupiah(pesanan.subtotal)}</span></div>
      {pesanan.pajakNominal > 0 && (
        <div className="struk-baris"><span>Pajak {pesanan.pajakPersen}%</span><span>{rupiah(pesanan.pajakNominal)}</span></div>
      )}
      {pesanan.serviceNominal > 0 && (
        <div className="struk-baris"><span>Service {pesanan.servicePersen}%</span><span>{rupiah(pesanan.serviceNominal)}</span></div>
      )}
      <div className="struk-baris" style={{ fontWeight: 700, fontSize: "1.1em" }}>
        <span>TOTAL</span><span>{rupiah(pesanan.total)}</span>
      </div>
      <div className="struk-garis" />
      {(pesanan.pembayarans ?? []).map((b) => (
        <div key={b.id}>
          <div className="struk-baris">
            <span>{b.metode}{b.referensi ? ` (${b.referensi})` : ""}</span>
            <span>{rupiah(b.jumlah)}</span>
          </div>
          {b.metode === "TUNAI" && (
            <div className="struk-baris"><span>Diterima</span><span>{rupiah(b.jumlah + b.kembalian)}</span></div>
          )}
          {b.kembalian > 0 && (
            <div className="struk-baris"><span>Kembalian</span><span>{rupiah(b.kembalian)}</span></div>
          )}
        </div>
      ))}
      {!lunas && (
        <div className="struk-baris" style={{ fontWeight: 700 }}>
          <span>SISA</span><span>{rupiah(pesanan.total - sudahBayar)}</span>
        </div>
      )}
      <div className="struk-garis" />
      <div className="struk-tengah">
        <p>{settings.FOOTER_STRUK}</p>
        <p style={{ fontSize: "0.85em" }}>*** {lunas ? "LUNAS" : "BELUM LUNAS"} ***</p>
      </div>
    </div>
  )
}

/** Kitchen Order Ticket — cetak untuk dapur */
export function KotPesanan({ pesanan }: { pesanan: Pesanan }) {
  return (
    <div className="struk-80" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
      <div className="struk-tengah">
        <p style={{ fontWeight: 700, fontSize: "1.3em" }}>=== KITCHEN ORDER ===</p>
      </div>
      <p style={{ fontWeight: 700, fontSize: "1.15em" }}>{pesanan.id}</p>
      <div className="struk-baris">
        <span>{LABEL_TIPE[pesanan.tipe]}</span>
        <span>{pesanan.meja ? pesanan.meja.nama : pesanan.namaPelanggan ?? "-"}</span>
      </div>
      <div className="struk-baris"><span>Waktu</span><span>{waktu(pesanan.createdAt)}</span></div>
      <div className="struk-garis" />
      {(pesanan.items ?? []).map((it) => (
        <div key={it.id}>
          <p className="kot-item">{it.qty}x {it.namaMenu}</p>
          {it.catatan && <p style={{ fontSize: "1em", fontStyle: "italic" }}>&raquo; {it.catatan}</p>}
        </div>
      ))}
      {pesanan.catatan && (
        <>
          <div className="struk-garis" />
          <p style={{ fontWeight: 700 }}>Catatan: {pesanan.catatan}</p>
        </>
      )}
      <div className="struk-garis" />
      <div className="struk-tengah"><p>{pesanan.tipe === "DINE_IN" ? "Sajikan di meja" : "Bungkus / kirim"}</p></div>
    </div>
  )
}
