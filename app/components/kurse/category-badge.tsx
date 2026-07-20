import type { Subject } from '@/types/marketing'
import { Badge } from '@/app/components/ui/badge'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  label: string
  subject?: Subject
  className?: string
}

const subjectClassMap: Record<Exclude<Subject, 'mixed'>, string> = {
  de: 'bg-subject-de-pale text-subject-de-foreground',
  ma: 'bg-subject-ma-pale text-subject-ma-foreground',
  fr: 'bg-subject-fr-pale text-subject-fr-foreground',
  nmg: 'bg-subject-nmg-pale text-subject-nmg-foreground',
}

// Getrennt von StatusBadge (Abschnitt 1b): Fach-/Fit-Tags, keine Verfügbarkeitsaussage.
function CategoryBadge({ label, subject, className }: CategoryBadgeProps) {
  const subjectClassName = subject && subject !== 'mixed' ? subjectClassMap[subject] : undefined

  return (
    <Badge variant={subjectClassName ? undefined : 'outline'} className={cn(subjectClassName, className)}>
      {label}
    </Badge>
  )
}

export { CategoryBadge }
