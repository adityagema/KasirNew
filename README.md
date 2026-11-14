# Sistem Kasir Restoran (POS)

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Prisma](https://img.shields.io/badge/Prisma-6-2d3748) ![SQLite](https://img.shields.io/badge/SQLite-embedded-003b57) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8)

Aplikasi kasir (Point of Sale) restoran full-stack berbasis web. Satu aplikasi mencakup seluruh alur operasional harian: dari transaksi di kasir, antrian pesanan di dapur, pengelolaan menu dan meja, pengendalian stok bahan baku berbasis resep, hingga laporan penjualan.

Dibangun sebagai **single-page application** (Next.js App Router) dengan REST API di server yang sama dan database **SQLite** melalui Prisma ORM, sehingga dapat langsung dijalankan di satu mesin tanpa layanan eksternal.

> **Demo langsung:** versi terpublikasi dapat dicoba di <https://f1fnq9pa7g71-d.space-z.ai/> — masuk menggunakan salah satu akun contoh pada bagian [Akun Bawaan](#akun-bawaan).

---

## Daftar Isi

1. [Fitur](#fitur)
2. [Teknologi](#teknologi)
3. [Memulai](#memulai)
4. [Akun Bawaan](#akun-bawaan)
5. [Struktur Proyek](#struktur-proyek)
6. [REST API](#rest-api)
7. [Aturan Bisnis Penting](#aturan-bisnis-penting)
8. [Pengaturan Aplikasi](#pengaturan-aplikasi)

---

## Fitur

### Autentikasi & Pengguna

- Login menggunakan session token berkedaluwarsa (durasi default 8 jam, dapat diatur).
- Password di-hash dengan **scrypt + salt acak per pengguna** (bawaan Node.js `crypto`, perbandingan *timing-safe*).
- Dua peran: **MANAGEMENT** dan **KASIR** dengan menu sidebar berbeda.
- Menonaktifkan pengguna otomatis memutus seluruh sesi aktifnya.
- Audit log aktivitas (login, perubahan data, pembatalan pesanan, dll).

### Kasir (POS)

- Antarmuka dua kolom: katalog menu di kiri, keranjang di kanan, dengan **catatan per item**.
- Tipe pesanan: **DINE IN** (wajib memilih meja; satu meja hanya boleh memiliki satu pesanan aktif), **TAKE AWAY**, dan **DELIVERY** (nama, telepon, alamat pelanggan).
- Nomor pesanan otomatis berformat `ORD-YYYYMMDD-0001` mengikuti zona waktu Asia/Jakarta.
- Pajak dan biaya layanan (service charge) dihitung otomatis sesuai pengaturan.
- Menu yang dinonaktifkan otomatis tidak muncul di katalog POS.

### Dapur (Kitchen Display)

- Layar antrian pesanan untuk staf dapur dengan pembaruan otomatis (polling).
- Alur status satu arah: `PENDING → PREPARING → READY → SERVED → COMPLETED` (atau `CANCELLED`).

### Pembayaran

- **Tunai** dengan input uang diterima, kembalian dihitung otomatis; transaksi ditolak bila uang kurang.
- **QRIS / Transfer / Debit** dengan pencatatan nomor referensi.
- **Split bill** per item atau per nominal, lengkap dengan pembagian pajak & service secara proporsional.
- **Merge bill** untuk menggabungkan beberapa pesanan dalam satu meja (divalidasi di sisi server).
- Struk **58 mm / 80 mm** siap cetak (CSS `@media print`) serta **KOT** (Kitchen Order Ticket) untuk dapur.

### Stok & Resep

- Master bahan baku: satuan, stok, stok minimum, harga modal.
- Resep (Bill of Materials) per menu: satu porsi menu memakai berapa bahan.
- **Potongan stok otomatis hanya sekali** per pesanan, pada tahap yang dipilih pengaturan (`STOK_REDUCE_ON` = saat pembayaran atau saat pesanan dikirim), dijaga oleh flag `stokDiproses`.
- Mutasi stok manual (masuk/keluar/penyesuaian) plus kartu riwayat mutasi otomatis.
- Peringatan stok menipis di dashboard.

### Laporan & Dashboard

- Laporan penjualan dengan filter rentang tanggal, kasir, dan metode pembayaran; pesanan berstatus `CANCELLED` (BATAL) tidak dihitung.
- Dashboard: kartu ringkasan (omzet hari ini, jumlah transaksi, pesanan aktif, meja terisi), grafik tren, top 5 menu terlaris, dan daftar stok menipis.

---

## Teknologi

| Komponen | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, output `standalone`) |
| Bahasa | TypeScript |
| Frontend | React 19, Tailwind CSS 4, komponen shadcn/ui, Recharts |
| Backend | Next.js Route Handlers (REST API) |
| Database | SQLite + Prisma ORM |
| Keamanan | scrypt password hashing, cookie sesi `httpOnly` berkedaluwarsa, guard peran per endpoint |

---

## Memulai

### Prasyarat

- Node.js 18+ (atau Bun 1.x)
- npm (bawaan Node.js)

### Instalasi

```bash
# 1. Ambil kode
git clone <url-repositori-anda>
cd pos-restoran

# 2. Pasang dependensi
npm install

# 3. Siapkan database (Prisma + SQLite)
npx prisma generate
npm run db:push

# 4. Isi data contoh (pengguna, kategori, menu, meja, bahan, resep, pengaturan)
npx tsx prisma/seed.ts
# atau dengan Bun: bun prisma/seed.ts

# 5. Jalankan mode pengembangan
npm run dev
```

Buka `http://localhost:3000`.

### Variabel Lingkungan

Buat file `.env` di akar proyek:

```env
DATABASE_URL=file:/jalur/absolut/ke/proyek/db/custom.db
```

Disarankan memakai jalur absolut agar tidak bergantung pada lokasi kerja proses.

### Build Produksi

```bash
npm run build
npm start        # melayani di port 3000
```

Perintah `npm start` menjalankan server hasil build `standalone` (`.next/standalone/server.js`).

---

## Akun Bawaan

Dibuat oleh skrip seed — **segera ganti password setelah instalasi**:

| Peran | Email | Password |
| --- | --- | --- |
| MANAGEMENT | `admin@pos.id` | `admin123` |
| KASIR | `kasir@pos.id` | `kasir123` |
| KASIR | `kasir2@pos.id` | `kasir123` |

Data contoh lainnya: 5 kategori, 14 menu, 8 meja, 11 bahan baku, 18 baris resep, dan 9 item pengaturan.

---

## Struktur Proyek

```
├── prisma/
│   ├── schema.prisma        # skema database (User, Session, Menu, Meja,
│   │                        #  Pesanan, Pembayaran, BahanBaku, Resep,
│   │                        #  MutasiStok, Pengaturan, AuditLog)
│   └── seed.ts              # data awal
├── src/
│   ├── app/
│   │   ├── api/             # REST API (route handlers)
│   │   ├── page.tsx         # SPA utama (login + semua modul)
│   │   └── layout.tsx
│   ├── components/pos/      # modul UI: AppShell (sidebar & peran),
│   │                        #  LoginView, DashboardView, POSView,
│   │                        #  PesananView, MejaView, DapurView,
│   │                        #  MenuView, StokView, LaporanView,
│   │                        #  PenggunaView, PengaturanView,
│   │                        #  AuditView, StrukKot (struk & KOT)
│   ├── lib/
│   │   ├── db.ts            # klien Prisma
│   │   ├── auth.ts          # sesi & guard peran
│   │   ├── password.ts      # hash scrypt
│   │   ├── order-utils.ts   # nomor pesanan, pajak, stok, validasi meja
│   │   └── settings.ts      # pengaturan aplikasi
│   └── components/ui/       # komponen shadcn/ui
└── db/
    └── custom.db            # file database SQLite (dibuat saat db:push)
```

---

## REST API

Semua endpoint merespons `{ success, data }` atau `{ success: false, message }`. Autentikasi memakai cookie sesi `pos_session` bertanda `httpOnly` yang diterbitkan endpoint login dan berlaku sesuai pengaturan `SESSION_JAM` (default 8 jam).

| Metode & Jalur | Fungsi |
| --- | --- |
| `POST /api/auth/login` | Login, menghasilkan token sesi |
| `POST /api/auth/logout` | Matikan sesi |
| `GET /api/auth/me` | Profil pengguna saat ini |
| `GET /api/dashboard` | Statistik & grafik sesuai peran |
| `GET/POST /api/kategori` , `PUT/DELETE /api/kategori/[id]` | CRUD kategori |
| `GET/POST /api/menu` , `PUT/DELETE /api/menu/[id]` | CRUD menu (kode `MNU001` dst.) |
| `GET/POST /api/meja` , `PUT/DELETE /api/meja/[id]` | CRUD meja |
| `GET/POST /api/pesanan` | Daftar & buat pesanan baru |
| `GET/PUT /api/pesanan/[id]` | Detail & ubah pesanan |
| `POST /api/pesanan/[id]/status` | Alur status dapur (satu arah) dan aksi `BATAL` untuk pembatalan |
| `POST /api/pesanan/[id]/bayar` | Pembayaran (mendukung split bill) |
| `POST /api/pesanan/gabung` | Merge bill |
| `GET /api/dapur` | Antrian pesanan untuk kitchen display |
| `GET/POST /api/stok/bahan` , `PUT/DELETE /api/stok/bahan/[id]` | CRUD bahan baku |
| `POST /api/stok/mutasi` | Mutasi stok manual |
| `GET /api/resep` | Resep per menu |
| `GET /api/laporan` | Laporan penjualan (filter tanggal/kasir/metode) |
| `GET/POST /api/pengguna` , `PUT/DELETE /api/pengguna/[id]` | CRUD pengguna |
| `GET/PUT /api/pengaturan` | Pengaturan aplikasi |
| `GET /api/audit` | Audit log |

---

## Aturan Bisnis Penting

**Satu meja, satu pesanan aktif.** Saat membuat pesanan DINE IN, server menghitung pesanan berstatus aktif (`PENDING/PREPARING/READY/SERVED`) pada meja tersebut; bila ada, permintaan ditolak dengan kode `409`. Meja otomatis kosong kembali saat seluruh pesanan dine-in-nya selesai.

**Stok dipotong tepat sekali.** Setiap pesanan memiliki flag `stokDiproses`. Pengurangan stok berdasarkan resep dijalankan pada tahap yang ditentukan `STOK_REDUCE_ON` dan langsung menandai flag, sehingga tidak ada potongan ganda walau proses diulang. Setiap potongan tercatat sebagai mutasi bertipe `OTOMATIS` dengan stok sesudahnya.

**Status pesanan bergerak satu arah.** `PENDING → PREPARING → READY → SERVED → COMPLETED`. Pembatalan dilakukan lewat aksi `BATAL` pada endpoint status: hanya untuk pesanan yang belum selesai. Pesanan batal tetap tersimpan (tidak dihapus) agar jejak audit tetap ada, namun tidak dihitung dalam laporan.

**Pembayaran terkontrol.** Uang tunai kurang dari total akan ditolak. Split bill per item memakai proporsi pajak & service per item (kolom `bayarId` pada detail pesanan), sehingga satu pesanan dapat dilunasi bertahap oleh beberapa pembayaran.

---

## Pengaturan Aplikasi

Nilai awal dari seed, dapat diubah lewat menu **Pengaturan** (MANAGEMENT):

| Kunci | Nilai Awal | Keterangan |
| --- | --- | --- |
| `NAMA_RESTORAN` | Restoran Nusantara | Nama pada struk & header |
| `ALAMAT` | Jl. Merdeka No. 123, Jakarta | Alamat pada struk |
| `TELEPON` | 021-555-0123 | Telepon pada struk |
| `PAJAK_PERSEN` | 10 | Pajak (%) |
| `SERVICE_PERSEN` | 5 | Biaya layanan (%) |
| `STRUK_UKURAN` | 80 | Lebar struk: `58` atau `80` mm |
| `STOK_REDUCE_ON` | PAYMENT | Tahap potong stok: `PAYMENT` atau `KIRIM` |
| `SESSION_JAM` | 8 | Masa berlaku sesi login (jam) |
| `FOOTER_STRUK` | Terima kasih atas kunjungan Anda! | Catatan kaki struk |

---

## Lisensi

Dirilis di bawah [lisensi MIT](LICENSE).
