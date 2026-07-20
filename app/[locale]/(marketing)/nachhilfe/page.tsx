import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { nachhilfePageModel } from '@/types/marketing.fixtures'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { SubscriptionCard } from '@/app/components/marketing/subscription-card'

export const metadata: Metadata = {
  title: nachhilfePageModel.hero.title,
  description: nachhilfePageModel.hero.description,
}

export default async function NachhilfePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={nachhilfePageModel.hero} />
      </Section>

      <Section variant="muted">
        <ResponsiveGrid columns={{ base: 1, md: 2 }}>
          {nachhilfePageModel.plans.map((plan) => (
            <SubscriptionCard key={plan.id} plan={plan} />
          ))}
        </ResponsiveGrid>
      </Section>
    </>
  )
}
