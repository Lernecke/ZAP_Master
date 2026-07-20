import type { ExamTimelineSegment } from '@/types/marketing'
import { cn } from '@/lib/utils'

interface ExamSimTimelineProps {
  segments: ExamTimelineSegment[]
}

const subjectClassMap: Record<ExamTimelineSegment['subject'], string> = {
  de: 'bg-subject-de-pale text-subject-de-foreground',
  ma: 'bg-subject-ma-pale text-subject-ma-foreground',
  pause: 'bg-muted text-muted-foreground',
}

const subjectLabelMap: Record<ExamTimelineSegment['subject'], string> = {
  de: 'Deutsch',
  ma: 'Mathematik',
  pause: 'Pause',
}

// Reine Sequenzdarstellung (keine proportionalen Breiten nach Minutenzahl) -- passend zum
// bewusst einfachen Komponentenstil der übrigen Kurskomponenten.
function ExamSimTimeline({ segments }: ExamSimTimelineProps) {
  return (
    <ol className="flex flex-wrap gap-3">
      {segments.map((segment) => (
        <li
          key={segment.id}
          className={cn('flex flex-col gap-1 rounded-lg px-4 py-3', subjectClassMap[segment.subject])}
        >
          <span className="font-mono text-[11px] uppercase tracking-wide opacity-80">
            {subjectLabelMap[segment.subject]}
          </span>
          <span className="font-medium">{segment.label}</span>
          {segment.minutes > 0 ? (
            <span className="text-sm opacity-80">{segment.minutes} Min.</span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export { ExamSimTimeline }
