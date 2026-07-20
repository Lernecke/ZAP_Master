import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { aboutPageModel } from '@/types/marketing.fixtures'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { CourseContent } from '@/app/components/kurse/course-content'
import { WhyUsGrid } from '@/app/components/kurse/why-us-grid'
import { SectionHeading } from '@/app/components/layout/section-heading'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: aboutPageModel.hero.title,
  description: aboutPageModel.hero.description,
}

export default async function UeberUnsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={aboutPageModel.hero} />
      </Section>

      <Section variant="muted">
        <CourseContent sections={aboutPageModel.storySections} />
      </Section>

      <Section>
        <WhyUsGrid features={aboutPageModel.principles} />
      </Section>

      <Section variant="muted">
        <div className="flex flex-col gap-6">
          <SectionHeading title="Team" level={3} />
          <ResponsiveGrid columns={{ base: 1, md: 2 }}>
            {aboutPageModel.teamGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{group.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </div>
      </Section>

      {aboutPageModel.cta ? (
        <Section>
          <Button asChild>
            <Link href={aboutPageModel.cta.href}>{aboutPageModel.cta.label}</Link>
          </Button>
        </Section>
      ) : null}
    </>
  )
}
