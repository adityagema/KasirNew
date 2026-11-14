"use client"

import { useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser } from "@/lib/types"
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginView({ onLogin }: { onLogin: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [lihatSandi, setLihatSandi] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await api<SessionUser>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      })
      toast.success(`Selamat datang, ${user.nama}!`)
      onLogin(user)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1b2a5e] via-[#24377a] to-[#1b2a5e] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-[#1b2a5e] flex items-center justify-center">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1b2a5e]">Sistem Kasir Restoran</h1>
            <p className="text-sm text-slate-500">Masuk dengan akun Anda untuk mulai bekerja</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@restoran.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={lihatSandi ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label="Tampilkan atau sembunyikan password"
                  onClick={() => setLihatSandi((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {lihatSandi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white h-11" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4 text-white text-sm">
          <p className="font-semibold mb-1">Akun demo:</p>
          <p>Manajemen — admin@pos.id / admin123</p>
          <p>Kasir — kasir@pos.id / kasir123</p>
        </div>
      </div>
    </div>
  )
}
