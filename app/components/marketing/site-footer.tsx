import type { SiteFooterModel } from '@/types/marketing'
import { Link } from '@/i18n/navigation'

interface SiteFooterProps {
  model: SiteFooterModel
}

// Genau einmal in app/[locale]/(marketing)/layout.tsx gerendert, nach {children} (Abschnitt 1b).
// Nur reale, durch Linktests geprüfte Ziele -- kein Footer-Markup in einzelnen Pages.
function SiteFooter({ model }: SiteFooterProps) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p>{model.copyright}</p>
        <ul className="flex items-center gap-4">
          {model.legal.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

export { SiteFooter }
