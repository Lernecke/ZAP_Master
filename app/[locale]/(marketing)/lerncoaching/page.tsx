import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { lerncoachingPageModel } from '@/types/marketing.fixtures'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { CourseFlow } from '@/app/components/kurse/course-flow'
import { CourseContent } from '@/app/components/kurse/course-content'
import { WhyUsGrid } from '@/app/components/kurse/why-us-grid'
import { FaqAccordion } from '@/app/components/marketing/faq-accordion'
import { Button } from '@/app/components/ui/button'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: lerncoachingPageModel.hero.title,
  description: lerncoachingPageModel.hero.description,
}

export default async function LerncoachingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={lerncoachingPageModel.hero} />
      </Section>

      <Section variant="muted">
        <CourseFlow steps={lerncoachingPageModel.flowSteps} />
      </Section>

      <Section>
        <WhyUsGrid features={lerncoachingPageModel.features} />
      </Section>

      <Section variant="muted">
        {lerncoachingPageModel.contentSections.map((section) => (
          <CourseContent key={section.id} sections={[section]} />
        ))}
      </Section>

      {lerncoachingPageModel.faq && lerncoachingPageModel.faq.length > 0 ? (
        <Section>
          <FaqAccordion items={lerncoachingPageModel.faq} />
        </Section>
      ) : null}

      {lerncoachingPageModel.relatedActions && lerncoachingPageModel.relatedActions.length > 0 ? (
        <Section variant="muted">
          <div className="flex flex-wrap gap-3">
            {lerncoachingPageModel.relatedActions.map((action) => (
              <Button key={action.href} asChild variant="outline">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  )
}
