import { Link } from '@/i18n/navigation'
import type { BookingAction } from '@/types/marketing'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'

interface BookingButtonProps {
  action: BookingAction
  onBook?: () => void
  block?: boolean
}

// Der eigentliche Buchungs-Flow bleibt der bestehende anmeldung-modal.tsx (Abschnitt 1b) -- "modal"
// ruft nur onBook auf, statt eine zweite, unabhängige Buchungsmodalität zu bauen.
function BookingButton({ action, onBook, block = false }: BookingButtonProps) {
  const className = block ? 'w-full min-h-[44px]' : 'min-h-[44px]'

  if (action.kind === 'disabled') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={block ? 'block w-full' : 'inline-block'}>
              <Button variant="outline" disabled aria-disabled="true" className={className}>
                {action.label}
                <span className="sr-only"> — {action.disabledReason}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{action.disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (action.kind === 'link') {
    return (
      <Button asChild className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <Button onClick={onBook} className={className}>
      {action.label}
    </Button>
  )
}

export { BookingButton }
