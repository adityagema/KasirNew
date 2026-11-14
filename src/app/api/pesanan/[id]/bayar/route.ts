import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, logAudit } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { bebaskanMejaJikaKosong, prosesStokPesanan, porsiItem } from "@/lib/order-utils"
import { ApiError, handle, ok } from "@/lib/api"

type P = { params: Promise<{ id: string }> }

const METODE = ["TUNAI", "QRIS", "TRANSFER", "DEBIT"]

/**
 * POST: catat pembayaran (penuh atau split).
 * - Tanpa itemIds & jumlah  : bayar sisa penuh
 * - Dengan itemIds          : split bill per item (porsi pajak+service proporsional)
 * - Dengan jumlah           : split bill per jumlah (cicilan)
 */
export async function POST(req: NextRequest, { params }: P) {
  return handle(async () => {
    const user = await requireUser(req)
    const { id } = await params
    const body = await req.json()
    const metode = String(body?.metode ?? "")
    if (!METODE.includes(metode)) throw new ApiError("Metode pembayaran tidak valid")

    const pesanan = await db.pesanan.findUnique({
      where: { id },
      include: { items: true, pembayarans: true },
    })
    if (!pesanan) throw new ApiError("Pesanan tidak ditemukan", 404)
    if (pesanan.status === "CANCELLED") throw new ApiError("Pesanan sudah dibatalkan")
    if (pesanan.status === "COMPLETED") throw new ApiError("Pesanan sudah lunas")

    const sudahDibayar = pesanan.pembayarans.reduce((s, p) => s + p.jumlah, 0)
    const sisa = pesanan.total - sudahDibayar
    if (sisa <= 0) throw new ApiError("Pesanan sudah lunas")

    const itemIds = Array.isArray(body?.itemIds) ? body.itemIds.map(String) : null
    const adaItemIds = itemIds && itemIds.length > 0
    const jumlahManual = body?.jumlah !== undefined && body?.jumlah !== null ? Number(body.jumlah) : null

    if (adaItemIds && jumlahManual) {
      throw new ApiError("Pilih salah satu: bayar per item atau bayar per jumlah")
    }

    // ---- hitung jumlah tagihan pembayaran ini ----
    let jumlah: number
    if (adaItemIds && itemIds) {
      const itemTerpilih = pesanan.items.filter((i) => itemIds.includes(i.id) && i.bayarId === null)
      if (itemTerpilih.length === 0) {
        throw new ApiError("Tidak ada item belum-dibayar yang dipilih")
      }
      const itemSudahDibayar = pesanan.items.filter((i) => i.bayarId !== null)
      const subtotalSisaItem = pesanan.items
        .filter((i) => i.bayarId === null)
        .reduce((s, i) => s + i.harga * i.qty, 0)
      // pajak+service dihitung proporsional terhadap subtotal awal
      jumlah = itemTerpilih.reduce(
        (s, i) =>
          s +
          porsiItem(i.harga, i.qty, pesanan.subtotal, pesanan.pajakNominal, pesanan.serviceNominal),
        0
      )
      // koreksi pembulatan agar total selalu pas:
      const sisaTagihanSistem = pesanan.total - sudahDibayar
      const sisanyaHanyaIni =
        pesanan.items.filter((i) => i.bayarId === null).length === itemTerpilih.length
      if (sisanyaHanyaIni) jumlah = sisaTagihanSistem
      void itemSudahDibayar
      void subtotalSisaItem
    } else if (jumlahManual) {
      jumlah = Math.round(jumlahManual)
      if (jumlah <= 0) throw new ApiError("Jumlah pembayaran harus lebih dari 0")
      if (jumlah > sisa) throw new ApiError(`Jumlah melebihi sisa tagihan (Rp${sisa.toLocaleString("id-ID")})`)
    } else {
      jumlah = sisa
    }

    // ---- validasi metode ----
    let kembalian = 0
    if (metode === "TUNAI") {
      const diterima = Number(body?.tunaiDiterima ?? 0)
      if (!diterima || diterima <= 0) throw new ApiError("Nominal uang diterima wajib diisi")
      if (diterima < jumlah) {
        throw new ApiError(
          `Uang diterima kurang Rp${(jumlah - diterima).toLocaleString("id-ID")} dari tagihan Rp${jumlah.toLocaleString("id-ID")}`
        )
      }
      kembalian = diterima - jumlah
    }

    // ---- simpan ----
    const pembayaran = await db.pembayaran.create({
      data: {
        pesananId: id,
        metode,
        jumlah,
        kembalian,
        referensi: body?.referensi ? String(body.referensi).trim() : null,
        kasirId: user.id,
      },
    })

    if (adaItemIds && itemIds) {
      await db.pesananItem.updateMany({
        where: { id: { in: itemIds }, pesananId: id, bayarId: null },
        data: { bayarId: pembayaran.id },
      })
    }

    const totalDibayar = sudahDibayar + jumlah
    const lunas = totalDibayar >= pesanan.total

    if (lunas && pesanan.status !== "COMPLETED") {
      await db.pesanan.update({ where: { id }, data: { status: "COMPLETED" } })
      const settings = await getSettings()
      if (settings.STOK_REDUCE_ON === "PAYMENT" || settings.STOK_REDUCE_ON === "KIRIM") {
        await prosesStokPesanan(id, user.id)
      }
      await bebaskanMejaJikaKosong(pesanan.mejaId)
    }

    const updated = await db.pesanan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        pembayarans: { orderBy: { createdAt: "asc" } },
        meja: { select: { nama: true } },
        kasir: { select: { nama: true } },
      },
    })

    await logAudit(
      user,
      "PEMBAYARAN",
      `${id} ${metode} Rp${jumlah.toLocaleString("id-ID")}${lunas ? " LUNAS" : " (split)"}`
    )

    return ok({
      pembayaran,
      lunas,
      sisa: Math.max(0, pesanan.total - totalDibayar),
      kembalian,
      pesanan: updated,
    })
  })
}
