export interface SessionUser {
  id: string
  nama: string
  email: string
  role: "MANAGEMENT" | "KASIR"
}

export interface Kategori {
  id: string
  nama: string
  urutan: number
  aktif: boolean
  _count?: { menus: number }
}

export interface Menu {
  id: string
  kode: string
  nama: string
  kategoriId: string
  harga: number
  deskripsi: string | null
  foto: string | null
  tersedia: boolean
  aktif: boolean
  createdAt?: string
  kategori?: { id: string; nama: string }
  jumlahResep?: number
}

export interface PesananAktifInfo {
  id: string
  total: number
  tipe: string
  status: string
  kasir: string
  createdAt: string
}

export interface Meja {
  id: string
  nama: string
  kapasitas: number
  status: "KOSONG" | "TERISI" | "RESERVASI"
  pesananAktif?: PesananAktifInfo[]
}

export interface PesananItem {
  id: string
  pesananId: string
  menuId: string
  namaMenu: string
  harga: number
  qty: number
  catatan: string | null
  bayarId: string | null
  createdAt: string
}

export interface Pembayaran {
  id: string
  pesananId: string
  metode: string
  jumlah: number
  kembalian: number
  referensi: string | null
  kasirId: string
  createdAt: string
  kasir?: { nama: string }
}

export interface Pesanan {
  id: string
  tipe: "DINE_IN" | "TAKE_AWAY" | "DELIVERY"
  mejaId: string | null
  meja?: { nama: string } | null
  namaPelanggan: string | null
  telepon: string | null
  alamat: string | null
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED"
  catatan: string | null
  kasirId: string
  kasir?: { nama: string }
  subtotal: number
  pajakPersen: number
  servicePersen: number
  pajakNominal: number
  serviceNominal: number
  total: number
  stokDiproses: boolean
  createdAt: string
  updatedAt: string
  items?: PesananItem[]
  pembayarans?: Pembayaran[]
}

export interface Settings {
  NAMA_RESTORAN: string
  ALAMAT: string
  TELEPON: string
  PAJAK_PERSEN: string
  SERVICE_PERSEN: string
  STRUK_UKURAN: string
  STOK_REDUCE_ON: string
  SESSION_JAM: string
  FOOTER_STRUK: string
}

export interface BahanBaku {
  id: string
  nama: string
  satuan: string
  stok: number
  minStok: number
  hargaModal: number
  aktif: boolean
  jumlahResep?: number
  bolehHapus?: boolean
}

export interface MutasiStok {
  id: string
  bahanId: string
  tipe: string
  qty: number
  stokSesudah: number
  keterangan: string | null
  refId: string | null
  createdAt: string
  bahan?: { nama: string; satuan: string }
}

export interface ResepRow {
  id?: string
  menuId?: string
  bahanId: string
  qty: number
  bahan?: { id: string; nama: string; satuan: string; stok: number }
}

export interface DashMgmt {
  peran: "MANAGEMENT"
  kartu: {
    omzetHariIni: number
    transaksiHariIni: number
    pesananAktif: number
    mejaTerisi: number
    totalMeja: number
    totalMenu: number
  }
  top5: Array<{ nama: string; qty: number; omzet: number }>
  grafik: Array<{ tanggal: string; omzet: number; transaksi: number }>
  stokMenipis: Array<{ nama: string; stok: number; satuan: string; minStok: number; menipis: boolean }>
  transaksiTerakhir: Pesanan[]
}

export interface DashKasir {
  peran: "KASIR"
  kartu: {
    transaksiSaya: number
    omzetSaya: number
    pesananAktif: number
    mejaKosong: number
    totalMeja: number
    pajakPersen: string
    servicePersen: string
  }
  pesananTerakhir: Pesanan[]
}

export interface LaporanData {
  periode: { dari: string; sampai: string }
  ringkasan: { omzet: number; transaksi: number; rataRata: number; totalPajak: number; totalService: number }
  perMetode: Record<string, { jumlah: number; nominal: number }>
  perTipe: Record<string, { jumlah: number; nominal: number }>
  perKategori: Record<string, { qty: number; nominal: number }>
  topMenu: Array<{ nama: string; qty: number; nominal: number }>
  grafik: Array<{ tanggal: string; omzet: number; transaksi: number }>
  rinci: Array<{
    id: string
    tanggal: string
    tipe: string
    meja: string | null
    kasir: string
    subtotal: number
    pajak: number
    service: number
    total: number
    metode: string
    jumlahItem: number
  }>
}

export interface AuditRow {
  id: string
  userId: string | null
  userNama: string | null
  aksi: string
  detail: string | null
  createdAt: string
}

export interface PenggunaRow {
  id: string
  nama: string
  email: string
  role: string
  aktif: boolean
  createdAt: string
  sesiAktif?: number
}
