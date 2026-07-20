import type { AudienceHeroContent } from '@/types/marketing'
import { PageIntro } from '@/app/components/layout/page-intro'

interface AudienceHeroProps {
  content: AudienceHeroContent
}

function AudienceHero({ content }: AudienceHeroProps) {
  return (
    <PageIntro
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
    />
  )
}

export { AudienceHero }
