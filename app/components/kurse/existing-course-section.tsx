import type { ExistingCourseCardModel } from '@/types/marketing'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { SectionHeading } from '@/app/components/layout/section-heading'
import { ExistingCourseCard } from '@/app/components/kurse/existing-course-card'

interface ExistingCourseSectionProps {
  courses: ExistingCourseCardModel[]
}

// Leerer Bestand rendert keine Sektion (Abschnitt 3).
function ExistingCourseSection({ courses }: ExistingCourseSectionProps) {
  if (courses.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Bestehende Kurse" level={3} />
      <ResponsiveGrid columns={{ base: 1, md: 2, lg: 3 }}>
        {courses.map((course) => (
          <ExistingCourseCard key={course.id} course={course} />
        ))}
      </ResponsiveGrid>
    </div>
  )
}

export { ExistingCourseSection }
