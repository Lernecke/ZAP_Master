import * as React from 'react'

import { cn } from '@/lib/utils'

function PageContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-container"
      className={cn('mx-auto w-full max-w-6xl px-6', className)}
      {...props}
    />
  )
}

export { PageContainer }
