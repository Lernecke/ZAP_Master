import type { TipCategory } from '@/types/marketing'
import { SectionHeading } from '@/app/components/layout/section-heading'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { TipCard } from '@/app/components/marketing/tip-card'

interface TipCategorySectionProps {
  category: TipCategory
}

function TipCategorySection({ category }: TipCategorySectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title={category.title} description={category.description} level={3} />
      <ResponsiveGrid columns={{ base: 1, md: 2, lg: 3 }} gap="sm">
        {category.tips.map((tip) => (
          <TipCard key={tip.id} tip={tip} />
        ))}
      </ResponsiveGrid>
    </div>
  )
}

export { TipCategorySection }
