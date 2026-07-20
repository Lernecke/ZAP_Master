import type { Audience, ServiceSubgroupModel } from '@/types/marketing'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { ServiceCard } from '@/app/components/marketing/service-card'

interface ServiceSubgroupProps {
  group: ServiceSubgroupModel
  audiences?: Audience[]
}

function ServiceSubgroup({ group, audiences = [] }: ServiceSubgroupProps) {
  return (
    <div className="flex flex-col gap-4">
      {group.label ? (
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {group.label}
        </p>
      ) : null}
      <ResponsiveGrid columns={{ base: 1, md: 2 }}>
        {group.cards.map((card) => (
          <ServiceCard key={card.id} service={card} audiences={audiences} />
        ))}
      </ResponsiveGrid>
    </div>
  )
}

export { ServiceSubgroup }
