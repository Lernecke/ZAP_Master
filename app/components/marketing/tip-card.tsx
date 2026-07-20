import type { TipPreview } from '@/types/marketing'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Link } from '@/i18n/navigation'

interface TipCardProps {
  tip: TipPreview
}

// Ohne tip.action (aktuell immer der Fall -- keine reale Artikelroute existiert) reiner
// semantischer Inhalt ohne Link/CTA, statt auf href="#" zurückzufallen (Abschnitt 3).
function TipCard({ tip }: TipCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-base">{tip.title}</CardTitle>
        <CardDescription>{tip.excerpt}</CardDescription>
      </CardHeader>
      {tip.action ? (
        <CardContent>
          <CardFooter className="px-0">
            <Button asChild variant="outline" size="sm">
              <Link href={tip.action.href}>{tip.action.label}</Link>
            </Button>
          </CardFooter>
        </CardContent>
      ) : null}
    </Card>
  )
}

export { TipCard }
