import type { SubscriptionPlan } from '@/types/marketing'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { StatusBadge } from '@/app/components/kurse/status-badge'
import { Link } from '@/i18n/navigation'
import { formatSubscriptionPrice } from '@/lib/pricing'

interface SubscriptionCardProps {
  plan: SubscriptionPlan
}

function SubscriptionCard({ plan }: SubscriptionCardProps) {
  const price = formatSubscriptionPrice(plan)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        {plan.recommended ? <StatusBadge status="empfohlen" /> : null}
        <CardTitle className="font-serif text-xl">{plan.title}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="space-y-1.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex gap-2 border-t border-border pt-1.5 text-sm text-foreground first:border-t-0 first:pt-0"
            >
              <span aria-hidden="true" className="text-secondary-foreground">
                —
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-end justify-between gap-3 border-t pt-6">
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">{price.value}</p>
          {price.note ? <p className="text-xs text-muted-foreground">{price.note}</p> : null}
        </div>
        {plan.cta.kind === 'link' ? (
          <Button asChild>
            <Link href={plan.cta.href}>{plan.cta.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled aria-disabled="true">
            {plan.cta.label}
            <span className="sr-only"> — {plan.cta.disabledReason}</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export { SubscriptionCard }
