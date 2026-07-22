import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { audiences } from '@/app/data/marketing-site'
import { listCatalogedOfferParams } from '@/lib/kurse/offer-catalog'
import { SITE_URL } from '@/lib/seo'
import { isMarketingSiteLive } from '@/lib/marketing-flag'

// Abschnitt 10.4 des Architektur-Briefings: "sitemap.ts enthält nur veröffentlichte kanonische
// DE-Routen." /kontakt, /impressum, /agb, /datenschutz sind seit 22.07.2026 dabei: alle vier haben
// jetzt echte, vom Betreiber bestätigte Inhalte; für Impressum/AGB/Datenschutz wurde die
// anwaltliche Prüfung ausdrücklich vom Betreiber übersprungen ("skip legal review"). /standorte
// bleibt bewusst draussen: nennt zwar echte Ortsnamen, aber keine vollständigen Adressen. Bleibt
// über den SiteFooter-Link weiterhin normal erreichbar/crawlbar, nur eben nicht aktiv beworben.
// listCatalogedOfferParams() ist bereits dieselbe Quelle, die generateStaticParams() für die
// Kursdetailseiten verwendet -- sie enthält von sich aus nur redaktionell freigegebene Angebote
// (z.B. fehlt der preiskonflikt-behaftete 5.-Klasse-Lerncamp dort bewusst, siehe
// lib/kurse/offer-catalog.ts), es gibt also keine zweite, separat zu pflegende Gate-Liste hier.
const STATIC_CONTENT_PATHS = [
  '',
  '/kontakt',
  '/impressum',
  '/agb',
  '/datenschutz',
  '/lerncoaching',
  '/nachhilfe',
  '/distance-learning',
  '/pruefungssimulation',
  '/tipps',
  '/ueber-uns',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  // Abschnitt 10.4 Feature-Flag/Cutover: bei deaktiviertem Marketing-Release-Flag (siehe
  // lib/marketing-flag.ts) sind die lokalisierten Marketingrouten per proxy.ts ohnehin auf /kurse
  // umgeleitet -- sie hier trotzdem zu listen würde Suchmaschinen zum toten Indexieren von Zielen
  // einladen, die live gerade nicht erreichbar sind. Die Bestandsroute /kurse bleibt in jedem Fall.
  if (!isMarketingSiteLive()) {
    return [{ url: `${SITE_URL}/kurse`, changeFrequency: 'daily', priority: 0.5 }]
  }

  for (const locale of routing.locales) {
    for (const path of STATIC_CONTENT_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : 0.7,
      })
    }

    for (const audience of audiences) {
      entries.push({
        url: `${SITE_URL}/${locale}/kurse/${audience.slug}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    for (const { audience, angebot } of listCatalogedOfferParams()) {
      entries.push({
        url: `${SITE_URL}/${locale}/kurse/${audience}/${angebot}`,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  }

  // Bestehende unlokalisierte Bestandsroute (Abschnitt 6), bleibt bis zur beschlossenen Ablösung
  // eine echte, funktionierende Buchungsseite.
  entries.push({ url: `${SITE_URL}/kurse`, changeFrequency: 'daily', priority: 0.5 })

  return entries
}
