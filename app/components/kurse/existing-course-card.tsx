import { Link } from '@/i18n/navigation'
import type { ExistingCourseCardModel } from '@/types/marketing'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { CategoryBadge } from '@/app/components/kurse/category-badge'
import { formatChfRappen } from '@/lib/pricing'

const subjectLabels: Record<ExistingCourseCardModel['subject'], string> = {
  de: 'Deutsch',
  ma: 'Mathematik',
  fr: 'Französisch',
  nmg: 'Natur, Mensch, Gesellschaft',
}

interface ExistingCourseCardProps {
  course: ExistingCourseCardModel
  /** Schritt 8: wenn gesetzt, öffnet die Karte die bestehende Buchungsmodalität in-place statt
   *  zu /kurse zu verlinken (dessen "?kurs="-Parameter dort nicht ausgewertet wird). */
  onBook?: (course: ExistingCourseCardModel) => void
}

// Bucht weiterhin über die unveränderte sourceKursId -- die stabile intensivwoche_kurse.id, nie
// neu abgeleitet (Abschnitt 2.10).
function ExistingCourseCard({ course, onBook }: ExistingCourseCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CategoryBadge label={subjectLabels[course.subject]} subject={course.subject} />
        <CardTitle className="font-serif text-lg">{course.title}</CardTitle>
        <CardDescription>{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {course.classLabels.join(', ')} · {course.teacher}
        </p>
        {course.highlights.length > 0 ? (
          <ul className="mt-auto space-y-1.5">
            {course.highlights.map((highlight) => (
              <li key={highlight} className="text-sm text-foreground">
                — {highlight}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 border-t pt-6">
        <p className="font-serif text-lg font-semibold text-foreground">
          {formatChfRappen(course.regularPriceRappen)}
        </p>
        {onBook ? (
          <Button variant="outline" onClick={() => onBook(course)}>
            Termine ansehen
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/kurse?kurs=${course.sourceKursId}`}>Termine ansehen</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export { ExistingCourseCard }
