"use client"

import { useState } from "react"
import type { SessionUser } from "@/lib/types"
import { api } from "@/lib/client-api"
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Armchair, ChefHat,
  UtensilsCrossed, Package, BarChart3, Users, ScrollText, Settings,
  LogOut, Menu as MenuIcon, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import DashboardView from "@/components/pos/DashboardView"
import POSView from "@/components/pos/POSView"
import PesananView from "@/components/pos/PesananView"
import MejaView from "@/components/pos/MejaView"
import DapurView from "@/components/pos/DapurView"
import MenuView from "@/components/pos/MenuView"
import StokView from "@/components/pos/StokView"
import LaporanView from "@/components/pos/LaporanView"
import PengaturanView from "@/components/pos/PengaturanView"
import PenggunaView from "@/components/pos/PenggunaView"
import AuditView from "@/components/pos/AuditView"

type ViewKey =
  | "dashboard" | "pos" | "pesanan" | "meja" | "dapur" | "menu"
  | "stok" | "laporan" | "pengguna" | "audit" | "pengaturan"

const NAV: Array<{ key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; peran: ("MANAGEMENT" | "KASIR")[] }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, peran: ["MANAGEMENT", "KASIR"] },
  { key: "pos", label: "POS Kasir", icon: ShoppingBag, peran: ["MANAGEMENT", "KASIR"] },
  { key: "pesanan", label: "Pesanan", icon: ClipboardList, peran: ["MANAGEMENT", "KASIR"] },
  { key: "meja", label: "Meja", icon: Armchair, peran: ["MANAGEMENT", "KASIR"] },
  { key: "dapur", label: "Dapur", icon: ChefHat, peran: ["MANAGEMENT", "KASIR"] },
  { key: "menu", label: "Menu & Kategori", icon: UtensilsCrossed, peran: ["MANAGEMENT", "KASIR"] },
  { key: "stok", label: "Stok & Resep", icon: Package, peran: ["MANAGEMENT"] },
  { key: "laporan", label: "Laporan Penjualan", icon: BarChart3, peran: ["MANAGEMENT", "KASIR"] },
  { key: "pengguna", label: "Pengguna", icon: Users, peran: ["MANAGEMENT"] },
  { key: "audit", label: "Audit Log", icon: ScrollText, peran: ["MANAGEMENT"] },
  { key: "pengaturan", label: "Pengaturan", icon: Settings, peran: ["MANAGEMENT"] },
]

export default function AppShell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [view, setView] = useState<ViewKey>("dashboard")
  const [sidebarBuka, setSidebarBuka] = useState(false)

  const nav = NAV.filter((n) => n.peran.includes(user.role))
  const aktif = nav.find((n) => n.key === view) ?? nav[0]

  async function keluar() {
    try {
      await api("/api/auth/logout", { method: "POST" })
      onLogout()
    } catch {
      toast.error("Gagal logout")
    }
  }

  function pilih(v: ViewKey) {
    setView(v)
    setSidebarBuka(false)
  }

  const judul: Record<ViewKey, string> = {
    dashboard: "Dashboard",
    pos: "POS Kasir",
    pesanan: "Pesanan",
    meja: "Meja",
    dapur: "Kitchen Display",
    menu: "Menu & Kategori",
    stok: "Stok & Resep",
    laporan: "Laporan Penjualan",
    pengguna: "Pengguna",
    audit: "Audit Log",
    pengaturan: "Pengaturan",
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-[#1b2a5e] text-[#dce2f3] w-64">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#2a3c7a]">
        <div className="h-9 w-9 rounded-xl bg-[#f97316] flex items-center justify-center shrink-0">
          <UtensilsCrossed className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white leading-tight">Sistem Kasir</p>
          <p className="text-xs text-[#8fa0d0]">Restoran POS</p>
        </div>
        <button
          className="ml-auto md:hidden text-[#8fa0d0] hover:text-white"
          aria-label="Tutup menu"
          onClick={() => setSidebarBuka(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto thin-scroll py-3 px-3 space-y-1">
        {nav.map((n) => {
          const Icon = n.icon
          const selected = view === n.key
          return (
            <button
              key={n.key}
              onClick={() => pilih(n.key)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-[#f97316] text-white shadow-md"
                  : "text-[#dce2f3] hover:bg-[#2a3c7a] hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {n.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-[#2a3c7a] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[#2a3c7a] flex items-center justify-center text-white font-bold shrink-0">
            {user.nama.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user.nama}</p>
            <p className="text-xs text-[#8fa0d0]">{user.role === "MANAGEMENT" ? "Manajemen" : "Kasir"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={keluar}
          className="w-full border-[#2a3c7a] text-[#dce2f3] hover:bg-[#2a3c7a] hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar desktop */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-30">{sidebar}</aside>

      {/* Sidebar mobile */}
      {sidebarBuka && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarBuka(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 md:ml-64 min-w-0 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            aria-label="Buka menu"
            onClick={() => setSidebarBuka(true)}
          >
            <MenuIcon className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-[#1b2a5e]">{judul[view]}</h1>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-slate-700 hidden sm:block">{user.nama}</p>
            <p className="text-xs text-slate-400">{user.role === "MANAGEMENT" ? "Manajemen" : "Kasir"}</p>
          </div>
        </header>

        {/* Konten */}
        <main className="flex-1 p-4 md:p-6">
          {view === "dashboard" && <DashboardView user={user} />}
          {view === "pos" && <POSView user={user} />}
          {view === "pesanan" && <PesananView user={user} />}
          {view === "meja" && <MejaView user={user} />}
          {view === "dapur" && <DapurView />}
          {view === "menu" && <MenuView user={user} />}
          {view === "stok" && <StokView />}
          {view === "laporan" && <LaporanView />}
          {view === "pengguna" && <PenggunaView />}
          {view === "audit" && <AuditView />}
          {view === "pengaturan" && <PengaturanView />}
        </main>
      </div>
    </div>
  )
}
