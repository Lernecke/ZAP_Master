import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { homePageModel } from "@/app/data/marketing-site"
import { buildPageMetadata } from "@/lib/seo"
import { PageContainer } from "@/app/components/layout/page-container"
import { Section } from "@/app/components/layout/section"
import { Badge } from "@/app/components/ui/badge"
import { KlassenPicker } from "@/app/components/marketing/klassen-picker"
import { ServiceSubgroup } from "@/app/components/marketing/service-subgroup"
import { FeaturedTestimonial } from "@/app/components/marketing/featured-testimonial"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildPageMetadata({
    title: homePageModel.hero.title,
    description: homePageModel.hero.description,
    path: '',
    locale,
  })
}

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Section spacing="lg">
        <PageContainer>
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              {/* Abschnitt 10.4 (Accessibility-Audit): text-secondary-foreground (weiss) stand
                  hier direkt auf dem Seitenhintergrund statt auf bg-secondary -- Kontrast 1.08:1
                  statt der geforderten 4.5:1 (axe-core color-contrast, WCAG 2 AA). secondary-
                  foreground ist ausschliesslich als Paar mit bg-secondary korrekt, siehe Badge
                  "secondary"-Variante bzw. app/components/layout/page-intro.tsx. */}
              <Badge variant="secondary" className="font-mono text-xs tracking-wide uppercase">
                {homePageModel.hero.eyebrow}
              </Badge>
              <h1 className="font-serif text-3xl font-semibold text-foreground md:text-4xl">
                {homePageModel.hero.title}
              </h1>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                {homePageModel.hero.description}
              </p>
            </div>
            <div className="w-full max-w-3xl text-left">
              <KlassenPicker audiences={homePageModel.audiences} />
            </div>
          </div>
        </PageContainer>
      </Section>

      <Section variant="muted">
        <PageContainer>
          <div className="flex flex-col gap-10">
            {homePageModel.serviceGroups.map((group) => (
              <ServiceSubgroup key={group.id} group={group} audiences={homePageModel.audiences} />
            ))}
          </div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <FeaturedTestimonial testimonial={homePageModel.featuredTestimonial} />
        </PageContainer>
      </Section>
    </>
  )
}
