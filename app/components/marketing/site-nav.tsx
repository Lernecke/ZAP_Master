'use client'

import { useState } from 'react'
import NextLink from 'next/link'
import { Menu } from 'lucide-react'
import type { SiteNavModel } from '@/types/marketing'
import { Link } from '@/i18n/navigation'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet'

interface SiteNavProps {
  model: SiteNavModel
}

// Genau einmal in app/[locale]/(marketing)/layout.tsx gerendert (Abschnitt 1b). Flache
// Direktlinks, kein Dropdown, kein EN-Schalter beim Deutsch-only-Launch. /login bleibt bewusst
// unlokalisiert (next/link statt der i18n-Link-Variante) -- alle übrigen Ziele liegen innerhalb
// des lokalisierten Marketing-Baums und nutzen @/i18n/navigation.
function SiteNav({ model }: SiteNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4"
      >
        <Link href={model.home.href} className="font-serif text-xl font-semibold text-foreground">
          {model.home.label === 'Startseite' ? 'Lernecke' : model.home.label}
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {model.audiences.map((audience) => (
            <li key={audience.id}>
              <Link
                href={audience.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {audience.navLabel}
              </Link>
            </li>
          ))}
          {model.primaryItems.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Button asChild size="sm" className="min-h-[44px] rounded-full px-6">
            <NextLink href={model.login.href}>{model.login.label}</NextLink>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Menü öffnen" className="min-h-[44px] min-w-[44px]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {model.audiences.map((audience) => (
                <Link
                  key={audience.id}
                  href={audience.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center text-base font-medium text-foreground"
                >
                  {audience.displayLabel}
                </Link>
              ))}
              {model.primaryItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center text-base font-medium text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-3 min-h-[44px] w-full rounded-full">
                <NextLink href={model.login.href} onClick={() => setOpen(false)}>
                  {model.login.label}
                </NextLink>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}

export { SiteNav }
