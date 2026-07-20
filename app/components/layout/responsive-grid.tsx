import * as React from 'react'

import { cn } from '@/lib/utils'

interface ResponsiveGridColumns {
  base?: 1 | 2 | 3 | 4
  sm?: 1 | 2 | 3 | 4
  md?: 1 | 2 | 3 | 4
  lg?: 1 | 2 | 3 | 4
}

const columnClassMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

const responsiveColumnClassMap: Record<'sm' | 'md' | 'lg', Record<number, string>> = {
  sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
  md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' },
  lg: { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' },
}

interface ResponsiveGridProps extends React.ComponentProps<'div'> {
  columns?: ResponsiveGridColumns
  gap?: 'sm' | 'default' | 'lg'
}

const gapClassMap: Record<'sm' | 'default' | 'lg', string> = {
  sm: 'gap-4',
  default: 'gap-6',
  lg: 'gap-8',
}

function ResponsiveGrid({
  className,
  columns = { base: 1, md: 2, lg: 3 },
  gap = 'default',
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      data-slot="responsive-grid"
      className={cn(
        'grid',
        gapClassMap[gap],
        columns.base ? columnClassMap[columns.base] : undefined,
        columns.sm ? responsiveColumnClassMap.sm[columns.sm] : undefined,
        columns.md ? responsiveColumnClassMap.md[columns.md] : undefined,
        columns.lg ? responsiveColumnClassMap.lg[columns.lg] : undefined,
        className
      )}
      {...props}
    />
  )
}

export { ResponsiveGrid }
