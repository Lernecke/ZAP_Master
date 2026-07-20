import type { FaqItem } from '@/types/marketing'

interface FaqAccordionProps {
  items: FaqItem[]
}

// Natives <details>/<summary> statt Radix Accordion -- gleiches, bereits etabliertes
// Zugänglichkeitsmuster wie SessionDetails (app/components/kurse/session-details.tsx).
function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {items.map((item) => (
        <details key={item.id} className="group px-5 py-4">
          <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {item.question}
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

export { FaqAccordion }
