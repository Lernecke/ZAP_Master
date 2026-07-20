import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import type { ContactPageModel } from '@/types/marketing'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'

// Kein HTML-Mockup und keine echten Kontaktkanäle im Projekt vorhanden (Abschnitt 6 der
// Routentabelle: "kein Mockup"). Abschnitt 9.1 erlaubt ausdrücklich, die Route technisch zu bauen,
// solange kein erfundener Name/Telefon/Adresse gezeigt wird -- deshalb hier lokal statt in
// app/data/marketing-site.ts (das explizit als "reale Inhalte"-Quelle dokumentiert ist).
const kontaktPageModel: ContactPageModel = {
  hero: {
    title: 'Kontakt',
    description: 'Wir sind gerne für Sie da.',
  },
  channels: [],
  note: 'Unsere Kontaktkanäle werden in Kürze ergänzt.',
}

export const metadata: Metadata = {
  title: kontaktPageModel.hero.title,
  description: kontaktPageModel.hero.description,
}

export default async function KontaktPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Section spacing="lg">
      <AudienceHero content={kontaktPageModel.hero} />
      {kontaktPageModel.channels.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {kontaktPageModel.channels.map((channel) => (
            <li key={channel.id} className="text-foreground">
              <span className="font-medium">{channel.label}:</span> {channel.value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-muted-foreground">{kontaktPageModel.note}</p>
      )}
    </Section>
  )
}
