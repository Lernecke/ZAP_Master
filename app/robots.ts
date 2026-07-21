import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Abschnitt 10.4: "robots.ts sperrt Dashboard/Auth/API und Staging."
//
// Staging/Test/Local sind "gesperrt" per Fail-closed-Default: nur wenn NEXT_PUBLIC_ALLOW_INDEXING
// in der jeweiligen Umgebung explizit auf 'true' gesetzt ist (Abschnitt 10.4 "Umgebungswerte" --
// Prod/Staging/Test/Local besitzen getrennte Werte), erlaubt robots.txt überhaupt Indexierung.
// Ohne diesen expliziten Schalter würde jede Nicht-Prod-Umgebung standardmässig crawlbar sein,
// sobald sie öffentlich erreichbar ist (z.B. eine Preview-/Staging-Deployment-URL) -- das
// widerspricht "sperrt ... Staging" und dem an anderer Stelle im Projekt etablierten Grundsatz,
// nichts ungeprüft/vorschnell zu veröffentlichen.
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'

// Deckt exakt die geschützten Routen aus proxy.ts (protectedPrefixes) plus Auth-Seiten und API --
// keine zweite, unabhängig zu pflegende Liste sensibler Pfade.
const DISALLOWED_PREFIXES = [
  '/dashboard',
  '/trainer',
  '/uebungen',
  '/pruefung',
  '/profil',
  '/aufsaetze',
  '/intensivkurse',
  '/materialien',
  '/arbeitszeiten',
  '/login',
  '/register',
  '/api',
]

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOWED_PREFIXES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
