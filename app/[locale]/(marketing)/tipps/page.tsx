import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { tipsPageModel } from '@/types/marketing.fixtures'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { TipCategorySection } from '@/app/components/marketing/tip-category-section'
import { FaqAccordion } from '@/app/components/marketing/faq-accordion'

export const metadata: Metadata = {
  title: tipsPageModel.hero.title,
  description: tipsPageModel.hero.description,
}

export default async function TippsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={tipsPageModel.hero} />
      </Section>

      <Section variant="muted">
        <div className="flex flex-col gap-12">
          {tipsPageModel.categories.map((category) => (
            <TipCategorySection key={category.id} category={category} />
          ))}
        </div>
      </Section>

      <Section>
        <FaqAccordion items={tipsPageModel.faq} />
      </Section>
    </>
  )
}
