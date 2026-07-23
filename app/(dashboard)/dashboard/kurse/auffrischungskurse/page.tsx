import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, CalendarClock } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { requireAdmin } from '@/lib/auth/guards'
import { getCourses } from './actions'

export default async function AuffrischungskurseAdminPage() {
  await requireAdmin()

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auffrischungs- & Intensivkurse</h1>
          <p className="text-muted-foreground mt-1">
            Einzeltermin-Kurse in Deutsch/Mathematik, unabhängig vom Gymiprüfungs-Kursangebot.
          </p>
        </div>
        <Link href="/dashboard/kurse/auffrischungskurse/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kurs
          </Button>
        </Link>
      </div>

      <Suspense fallback={<CoursesLoading />}>
        <CoursesContent />
      </Suspense>
    </div>
  )
}

async function CoursesContent() {
  const result = await getCourses()

  if (!result.success) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const courses = result.data ?? []

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Kurse vorhanden</h3>
        <p className="text-muted-foreground mb-6">Erstelle den ersten Auffrischungs-/Intensivkurs.</p>
        <Link href="/dashboard/kurse/auffrischungskurse/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Ersten Kurs erstellen
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/dashboard/kurse/auffrischungskurse/${course.id}`}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors flex flex-col gap-2"
        >
          <span className="font-medium text-foreground text-sm">{course.title}</span>
          <span className="text-xs text-muted-foreground">{course.location}</span>
          <span className="text-xs text-muted-foreground">
            CHF {course.price?.toFixed(2)} · {course.payment_method}
          </span>
        </Link>
      ))}
    </div>
  )
}

function CoursesLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}
