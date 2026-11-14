/**
 * Seed data awal sistem kasir restoran.
 * Jalankan: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/lib/password"

const db = new PrismaClient()

async function main() {
  console.log("Mulai seeding...")

  // ---------- Pengguna ----------
  const users = [
    { nama: "Administrator", email: "admin@pos.id", password: "admin123", role: "MANAGEMENT" },
    { nama: "Kasir Satu", email: "kasir@pos.id", password: "kasir123", role: "KASIR" },
    { nama: "Kasir Dua", email: "kasir2@pos.id", password: "kasir123", role: "KASIR" },
  ]
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: { nama: u.nama, role: u.role, aktif: true },
      create: {
        nama: u.nama,
        email: u.email,
        passwordHash: hashPassword(u.password),
        role: u.role,
        aktif: true,
      },
    })
  }
  console.log("Pengguna: 3 akun")

  // ---------- Kategori ----------
  const kategoriData = [
    { nama: "Makanan Utama", urutan: 1 },
    { nama: "Snack", urutan: 2 },
    { nama: "Minuman", urutan: 3 },
    { nama: "Dessert", urutan: 4 },
    { nama: "Paket Hemat", urutan: 5 },
  ]
  const kategori: Record<string, string> = {}
  for (const k of kategoriData) {
    const row = await db.kategori.upsert({
      where: { nama: k.nama },
      update: { urutan: k.urutan },
      create: k,
    })
    kategori[k.nama] = row.id
  }
  console.log(`Kategori: ${kategoriData.length}`)

  // ---------- Menu ----------
  const menuData: Array<[string, string, string, number]> = [
    ["MNU001", "Nasi Goreng Spesial", "Makanan Utama", 28000],
    ["MNU002", "Ayam Goreng Lalapan", "Makanan Utama", 32000],
    ["MNU003", "Mie Goreng Jawa", "Makanan Utama", 25000],
    ["MNU004", "Sate Ayam Madura", "Makanan Utama", 30000],
    ["MNU005", "Soto Ayam Kampung", "Makanan Utama", 27000],
    ["MNU006", "Tempe Mendoan", "Snack", 12000],
    ["MNU007", "Tahu Crispy", "Snack", 10000],
    ["MNU008", "Pisang Goreng Keju", "Snack", 15000],
    ["MNU009", "Es Teh Manis", "Minuman", 8000],
    ["MNU010", "Es Jeruk Peras", "Minuman", 12000],
    ["MNU011", "Kopi Susu Gula Aren", "Minuman", 18000],
    ["MNU012", "Es Cendol Dawet", "Minuman", 15000],
    ["MNU013", "Paket Nasi Ayam + Es Teh", "Paket Hemat", 35000],
    ["MNU014", "Paket Mie + Kopi", "Paket Hemat", 33000],
  ]
  let nomor = 0
  for (const [kode, nama, kat, harga] of menuData) {
    const ada = await db.menu.findUnique({ where: { kode } })
    if (!ada) {
      await db.menu.create({
        data: {
          kode, nama, harga,
          kategoriId: kategori[kat],
          deskripsi: `${nama} — menu andalan restoran`,
          tersedia: true, aktif: true,
        },
      })
      nomor++
    }
  }
  console.log(`Menu baru: ${nomor}`)

  // ---------- Meja ----------
  const mejaData: Array<[string, number]> = [
    ["Meja 01", 2], ["Meja 02", 2], ["Meja 03", 4], ["Meja 04", 4],
    ["Meja 05", 4], ["Meja 06", 6], ["Meja 07", 8], ["Lesehan 01", 6],
  ]
  for (const [nama, kap] of mejaData) {
    await db.meja.upsert({
      where: { nama },
      update: {},
      create: { nama, kapasitas: kap, status: "KOSONG" },
    })
  }
  console.log(`Meja: ${mejaData.length}`)

  // ---------- Bahan Baku ----------
  const bahanData: Array<[string, string, number, number, number]> = [
    ["Beras", "kg", 50, 10, 12000],
    ["Ayam Fillet", "kg", 20, 5, 38000],
    ["Telur", "butir", 200, 50, 2200],
    ["Mie Instan Kering", "bungkus", 100, 30, 3500],
    ["Kopi Bubuk Arabika", "kg", 5, 1, 90000],
    ["Teh Celup", "pcs", 300, 100, 400],
    ["Jeruk Peras", "kg", 15, 5, 18000],
    ["Gula Aren", "kg", 8, 2, 25000],
    ["Susu UHT", "liter", 24, 6, 17000],
    ["Tahu Putih", "pcs", 60, 20, 1500],
    ["Tempe", "pcs", 40, 15, 2000],
  ]
  let nomorBahan = 0
  for (const [nama, satuan, stok, minStok, hargaModal] of bahanData) {
    const ada = await db.bahanBaku.findFirst({ where: { nama } })
    if (!ada) {
      await db.bahanBaku.create({
        data: { id: undefined!, nama, satuan, stok, minStok, hargaModal, aktif: true } as never,
      })
      nomorBahan++
    }
  }
  // set id manual BHN001.. agar mudah dibaca
  const semuaBahan = await db.bahanBaku.findMany({ orderBy: { createdAt: "asc" } })
  console.log(`Bahan baku baru: ${nomorBahan}`)

  // ---------- Resep (BOM) ----------
  const bahanByName = Object.fromEntries(semuaBahan.map((b) => [b.nama, b.id]))
  const menuByKode = Object.fromEntries(
    (await db.menu.findMany()).map((m) => [m.kode, m.id])
  )
  const resepData: Array<[string, string, number]> = [
    // qty dalam satuan bahan (kg/liter/butir/pcs/bungkus)
    ["MNU001", "Beras", 0.15], ["MNU001", "Telur", 2],
    ["MNU002", "Ayam Fillet", 0.2], ["MNU002", "Beras", 0.15],
    ["MNU003", "Mie Instan Kering", 2], ["MNU003", "Telur", 1],
    ["MNU004", "Ayam Fillet", 0.15],
    ["MNU005", "Ayam Fillet", 0.1], ["MNU005", "Beras", 0.1],
    ["MNU006", "Tempe", 1],
    ["MNU007", "Tahu Putih", 3],
    ["MNU009", "Teh Celup", 1], ["MNU009", "Gula Aren", 0.02],
    ["MNU010", "Jeruk Peras", 0.15],
    ["MNU011", "Kopi Bubuk Arabika", 0.018], ["MNU011", "Susu UHT", 0.1], ["MNU011", "Gula Aren", 0.015],
    ["MNU012", "Gula Aren", 0.025],
  ]
  for (const [kode, bahan, qty] of resepData) {
    const menuId = menuByKode[kode]
    const bahanId = bahanByName[bahan]
    if (!menuId || !bahanId) continue
    const ada = await db.resep.findUnique({
      where: { menuId_bahanId: { menuId, bahanId } },
    })
    if (!ada) await db.resep.create({ data: { menuId, bahanId, qty } })
  }
  console.log(`Resep: ${resepData.length} baris`)

  // ---------- Pengaturan ----------
  const settingData: Record<string, string> = {
    NAMA_RESTORAN: "Restoran Nusantara",
    ALAMAT: "Jl. Merdeka No. 123, Jakarta",
    TELEPON: "021-555-0123",
    PAJAK_PERSEN: "10",
    SERVICE_PERSEN: "5",
    STRUK_UKURAN: "80",
    STOK_REDUCE_ON: "PAYMENT",
    SESSION_JAM: "8",
    FOOTER_STRUK: "Terima kasih atas kunjungan Anda!",
  }
  for (const [key, value] of Object.entries(settingData)) {
    await db.pengaturan.upsert({ where: { key }, update: {}, create: { key, value } })
  }
  console.log("Pengaturan: 9 item")

  console.log("Seeding selesai.")
  console.log("Login: admin@pos.id / admin123  |  kasir@pos.id / kasir123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
