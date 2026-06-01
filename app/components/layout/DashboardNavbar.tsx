'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Menu, X, LogOut, User, Zap, ChevronDown, GraduationCap, Check, RotateCcw } from 'lucide-react'
import { useClassFilter, CLASS_LEVELS } from '@/context/ClassFilterContext'

export default function DashboardNavbar() {
  const { name, email, isAuthenticated } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [classMenuOpen, setClassMenuOpen] = useState(false)
  const { selectedClass, setSelectedClass, userDefaultClass, isLoading, resetToUserDefault } = useClassFilter()

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex justify-between h-16 px-4">
        {/* Logo - gleiche Position wie Sidebar (w-64 = 256px, p-4 = 16px) */}
        <div className="flex items-center w-64 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">ZAP</span>
          </Link>
        </div>

        {/* Center - Class Filter */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setClassMenuOpen(!classMenuOpen)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {isLoading ? 'Laden...' : selectedClass || 'Alle Klassen'}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${classMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {classMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setClassMenuOpen(false)}
                />
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-20 py-2">
                  <div className="px-3 pb-2 mb-2 border-b border-border">
                    <p className="text-xs text-muted-foreground">Inhalte filtern nach</p>
                  </div>
                  
                  {/* Alle Klassen Option */}
                  <button
                    onClick={() => {
                      setSelectedClass(null)
                      setClassMenuOpen(false)
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      !selectedClass ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    <span>Alle Klassen</span>
                    {!selectedClass && <Check className="w-4 h-4" />}
                  </button>
                  
                  <hr className="my-1 border-border" />
                  
                  {CLASS_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedClass(level)
                        setClassMenuOpen(false)
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        selectedClass === level ? 'text-primary font-medium' : 'text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{level}</span>
                        {level === userDefaultClass && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            Profil
                          </span>
                        )}
                      </div>
                      {selectedClass === level && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                  
                  {userDefaultClass && selectedClass !== userDefaultClass && (
                    <>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={() => {
                          resetToUserDefault()
                          setClassMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Zurück zu {userDefaultClass}</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && (
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
                  <span className="text-sm text-foreground max-w-[150px] truncate">
                    {name || email}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-20 py-1">
                      <Link
                        href="/profil"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profil
                      </Link>
                      <hr className="my-1 border-border" />
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
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Menü schliessen' : 'Menü öffnen'}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg text-foreground hover:bg-accent transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-4 space-y-1">
            {/* Mobile Class Filter */}
            <div className="pb-3 mb-3 border-b border-border">
              <p className="text-xs text-muted-foreground px-2 mb-2">Klasse auswählen</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedClass(null)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !selectedClass 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground hover:bg-accent'
                  }`}
                >
                  Alle
                </button>
                {CLASS_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedClass(level)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedClass === level 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                  >
                    {level.replace(' Klasse', '')}
                  </button>
                ))}
              </div>
            </div>
            
            <Link
              href="/profil"
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="w-5 h-5" />
              Profil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-destructive hover:bg-destructive/10 w-full rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
