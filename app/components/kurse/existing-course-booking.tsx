'use client'

// Schritt 8: öffnet die bestehende Buchungsmodalität (app/(public)/kurse/anmeldung-modal.tsx) für
// Bestandskurse direkt auf den neuen Marketingseiten -- keine zweite Buchungsmodalität (Abschnitt
// 1b des Architektur-Briefings). Gleiche Server Action, gleiche book_intensivwoche_kurs()-RPC.

import { useRouter } from 'next/navigation'
import type { ExistingCourseCardModel } from '@/types/marketing'
import { ExistingCourseSection } from '@/app/components/kurse/existing-course-section'
import { useSession } from '@/lib/auth-client'

interface ExistingCourseBookingProps {
  courses: ExistingCourseCardModel[]
}

function ExistingCourseBooking({ courses }: ExistingCourseBookingProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleBook = (course: ExistingCourseCardModel) => {
    const targetUrl = `/intensivkurse?kurs=${course.sourceKursId}`
    if (session?.user) {
      router.push(targetUrl)
    } else {
      router.push(`/login?callbackUrl=${encodeURIComponent(targetUrl)}`)
    }
  }

  return <ExistingCourseSection courses={courses} onBook={handleBook} />
}

export { ExistingCourseBooking }
