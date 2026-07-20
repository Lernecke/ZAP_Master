import type { ContentSection } from '@/types/marketing'
import { SectionHeading } from '@/app/components/layout/section-heading'

interface CourseContentProps {
  sections: ContentSection[]
}

// Strukturierte Inhalte aus ContentSection/ContentGroup, nie ein roher HTML-String (Abschnitt 3).
function CourseContent({ sections }: CourseContentProps) {
  return (
    <div className="flex flex-col gap-10">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-4">
          <SectionHeading title={section.title} description={section.lede} level={3} />
          <div className="grid gap-6 md:grid-cols-2">
            {section.groups.map((group) => (
              <div key={group.id} className="flex flex-col gap-2">
                {group.subhead ? (
                  <h4 className="font-serif text-base font-semibold text-foreground">
                    {group.subhead}
                  </h4>
                ) : null}
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">
                      — {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { CourseContent }
