"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/client-api"
import type { SessionUser } from "@/lib/types"
import { UtensilsCrossed } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import LoginView from "@/components/pos/LoginView"
import AppShell from "@/components/pos/AppShell"

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<SessionUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#1b2a5e] flex items-center justify-center">
            <UtensilsCrossed className="h-7 w-7 text-white" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginView onLogin={setUser} />
  }

  return <AppShell user={user} onLogout={() => setUser(null)} />
}
