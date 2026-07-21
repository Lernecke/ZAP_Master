import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import type { LegalPageModel } from '@/types/marketing'
import { buildPageMetadata } from '@/lib/seo'
import { Section } from '@/app/components/layout/section'
import { LegalPageContent } from '@/app/components/marketing/legal-page-content'

// Kein freigegebener Rechtstext vorhanden (Abschnitt 9.1). Route technisch gebaut, öffentlicher
// Cutover bleibt bis zur fachlichen Freigabe blockiert -- lokal statt in einer "reale Inhalte"-
// Datenquelle, siehe Kommentar in kontakt/page.tsx.
const impressumModel: LegalPageModel = {
  title: 'Impressum',
  updatedAt: '2026-07-20',
  sections: [
    {
      id: 'pending',
      title: 'Inhalte folgen',
      groups: [
        {
          id: 'hinweis',
          items: ['Diese Seite wird ergänzt, sobald die rechtlich geprüften Inhalte vorliegen.'],
        },
      ],
    },
  ],
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildPageMetadata({
    title: impressumModel.title,
    description: 'Rechtliche Angaben zum Anbieter dieser Lernplattform.',
    path: '/impressum',
    locale,
  })
}

export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Section spacing="lg">
      <LegalPageContent model={impressumModel} />
    </Section>
  )
}
