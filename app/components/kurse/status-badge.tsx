import type { ComponentProps } from 'react'
import type { AvailabilityStatus } from '@/types/marketing'
import { Badge } from '@/app/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: AvailabilityStatus | 'empfohlen'
  className?: string
}

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const statusConfig: Record<
  AvailabilityStatus | 'empfohlen',
  { label: string; variant: BadgeVariant; className?: string }
> = {
  frei: { label: 'freie Plätze', variant: 'secondary' },
  wenige: { label: 'wenige Plätze', variant: undefined, className: 'bg-accent text-accent-foreground' },
  voll: { label: 'keine Plätze', variant: 'destructive' },
  empfohlen: { label: 'empfohlen', variant: 'default' },
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
