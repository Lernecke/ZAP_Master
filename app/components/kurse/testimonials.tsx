import Image from 'next/image'
import type { Testimonial } from '@/types/marketing'
import { Card, CardContent } from '@/app/components/ui/card'

interface TestimonialsProps {
  testimonials: Testimonial[]
}

// Der optional-leer-Guard (testimonials?.length ? ... : null) liegt beim Aufrufer (Abschnitt 3) --
// diese Komponente rendert immer ein Grid.
function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} className="flex flex-col gap-3 p-5">
          <CardContent className="flex flex-1 flex-col gap-3 p-0">
            <p className="flex-1 text-sm text-foreground">
              <span aria-hidden="true" className="font-serif text-xl text-accent">
                &ldquo;
              </span>
              {testimonial.quote}
            </p>
            <div className="flex items-center gap-2">
              {testimonial.avatar ? (
                <Image
                  src={testimonial.avatar.src}
                  alt={testimonial.avatar.alt}
                  width={testimonial.avatar.width}
                  height={testimonial.avatar.height}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : null}
              <p className="font-mono text-xs text-muted-foreground">
                {testimonial.author}
                {testimonial.role ? ` — ${testimonial.role}` : null}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { Testimonials }
