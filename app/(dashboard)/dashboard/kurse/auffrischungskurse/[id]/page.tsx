import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import { getCourseDetail } from '../actions'
import { CourseForm } from '../course-form'
import { OccurrenceList } from '../occurrence-list'

interface AuffrischungskursBearbeitenPageProps {
  params: Promise<{ id: string }>
}

export default async function AuffrischungskursBearbeitenPage({ params }: AuffrischungskursBearbeitenPageProps) {
  await requireAdmin()

  const { id } = await params
  const courseId = parseInt(id, 10)

  if (isNaN(courseId)) {
    notFound()
  }

  const result = await getCourseDetail(courseId)

  if (!result.success || !result.data) {
    notFound()
  }

  const { course, occurrences } = result.data

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/kurse/auffrischungskurse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Kurs bearbeiten</h1>
        <p className="text-muted-foreground mt-1">{course.title}</p>
      </div>

      <div className="space-y-6">
        <CourseForm course={course} modus="bearbeiten" />
        <OccurrenceList courseId={courseId} occurrences={occurrences} />
      </div>
    </div>
  )
}
