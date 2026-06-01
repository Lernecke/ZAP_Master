'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Zap, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

export function KurseHeader() {
  const { isAuthenticated, name, email, status } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">ZAP</span>
      </Link>

      <nav className="flex items-center gap-4">
        {status === 'loading' ? (
          // Loading state
          <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />
        ) : isAuthenticated ? (
          // Eingeloggt: Dashboard-Link und User-Menü
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="rounded-full px-4">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-medium text-sm">
                    {name?.charAt(0)?.toUpperCase() ||
                      email?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg z-20 py-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Abmelden
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          // Nicht eingeloggt: Login-Button
          <Link href="/login">
            <Button size="sm" className="rounded-full px-6">
              Anmelden
            </Button>
          </Link>
        )}
      </nav>
    </header>
  )
}
