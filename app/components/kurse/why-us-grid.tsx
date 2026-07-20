import type { Feature } from '@/types/marketing'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'

interface WhyUsGridProps {
  features: Feature[]
}

// "4 Gründe, die zählen" -- ContentCard-basierte Kacheln, keine eigene Card-Implementierung.
function WhyUsGrid({ features }: WhyUsGridProps) {
  return (
    <ResponsiveGrid columns={{ base: 1, md: 2 }}>
      {features.map((feature) => (
        <Card key={feature.id}>
          <CardHeader>
            <CardTitle className="font-serif text-base">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </ResponsiveGrid>
  )
}

export { WhyUsGrid }
