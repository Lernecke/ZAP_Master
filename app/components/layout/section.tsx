import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { PageContainer } from '@/app/components/layout/page-container'
import { Separator } from '@/app/components/ui/separator'

const sectionVariants = cva('w-full', {
  variants: {
    variant: {
      default: '',
      muted: 'bg-muted/50',
    },
    spacing: {
      sm: 'py-8 md:py-12',
      default: 'py-12 md:py-16',
      lg: 'py-16 md:py-24',
    },
  },
  defaultVariants: {
    variant: 'default',
    spacing: 'default',
  },
})

interface SectionProps extends React.ComponentProps<'section'>, VariantProps<typeof sectionVariants> {
  /** Renders a horizontal Separator above the section content. */
  separated?: boolean
}

function Section({ className, variant, spacing, separated = false, children, ...props }: SectionProps) {
  return (
    <section
      data-slot="section"
      className={cn(sectionVariants({ variant, spacing }), className)}
      {...props}
    >
      {separated ? <Separator className="mb-12" /> : null}
      <PageContainer>{children}</PageContainer>
    </section>
  )
}

export { Section }
