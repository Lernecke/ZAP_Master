import type { ComponentProps } from 'react'
import type { AvailabilityStatus } from '@/types/marketing'
import { Badge } from '@/app/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: AvailabilityStatus | 'empfohlen' | 'vorschau'
  className?: string
}

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const statusConfig: Record<
  AvailabilityStatus | 'empfohlen' | 'vorschau',
  { label: string; variant: BadgeVariant; className?: string }
> = {
  frei: { label: 'freie Plätze', variant: 'secondary' },
  wenige: { label: 'wenige Plätze', variant: undefined, className: 'bg-accent text-accent-foreground' },
  voll: { label: 'keine Plätze', variant: 'destructive' },
  empfohlen: { label: 'empfohlen', variant: 'default' },
  // Punkt 1 aus design-review-todo.md: neutrale, von "empfohlen"/Verfügbarkeits-Badges klar
  // unterscheidbare Kennzeichnung für Angebote mit vorläufigen Preisen (siehe
  // lib/kurse/pricing-status.ts).
  vorschau: { label: 'Vorschau', variant: 'outline' },
}

// Status wird nie nur über Farbe vermittelt (Abschnitt 1) -- der Text ist immer Teil des Badges.
function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}

export { StatusBadge }
