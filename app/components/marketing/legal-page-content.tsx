import type { LegalPageModel } from '@/types/marketing'
import { PageIntro } from '@/app/components/layout/page-intro'
import { CourseContent } from '@/app/components/kurse/course-content'

interface LegalPageContentProps {
  model: LegalPageModel
}

function LegalPageContent({ model }: LegalPageContentProps) {
  const updatedLabel = new Intl.DateTimeFormat('de-CH', { dateStyle: 'long' }).format(
    new Date(model.updatedAt)
  )

  return (
    <div className="flex flex-col gap-8">
      <PageIntro title={model.title} description={`Stand: ${updatedLabel}`} />
      <CourseContent sections={model.sections} />
    </div>
  )
}

export { LegalPageContent }
