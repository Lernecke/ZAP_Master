import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import type { LegalPageModel } from '@/types/marketing'
import { buildPageMetadata } from '@/lib/seo'
import { Section } from '@/app/components/layout/section'
import { LegalPageContent } from '@/app/components/marketing/legal-page-content'

// Kein freigegebener Rechtstext vorhanden (Abschnitt 9.1, analog zu impressum/page.tsx und
// datenschutz/page.tsx). Route technisch gebaut, öffentlicher Cutover bleibt bis zur fachlichen
// Freigabe blockiert -- lokal statt in einer "reale Inhalte"-Datenquelle.
const agbModel: LegalPageModel = {
  title: 'Allgemeine Geschäftsbedingungen',
  updatedAt: '2026-07-22',
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
    title: agbModel.title,
    description: 'Allgemeine Geschäftsbedingungen für Kursbuchungen auf dieser Lernplattform.',
    path: '/agb',
    locale,
  })
}

export default async function AgbPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Section spacing="lg">
      <LegalPageContent model={agbModel} />
    </Section>
  )
}
