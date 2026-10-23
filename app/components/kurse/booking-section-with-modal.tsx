'use client'

// Schritt 8: analoger Wrapper zu existing-course-booking.tsx, für Sessions, die aus dem
// editorialen CourseOffer-Katalog stammen. Öffnet dieselbe AnmeldungModal, keine zweite
// Buchungsmodalität (Abschnitt 1b des Architektur-Briefings).

import { useRouter } from 'next/navigation'
import type { CourseOffer, ExamSimulationOffer, SessionRow } from '@/types/marketing'
import { BookingSection } from '@/app/components/kurse/booking-section'
import { useSession } from '@/lib/auth-client'

interface BookingSectionWithModalProps {
  // ExamSimulationOffer teilt booking/Preisfelder mit CourseOffer (Schritt 11).
  offer: CourseOffer | ExamSimulationOffer
  sessions: SessionRow[]
}

function BookingSectionWithModal({ offer, sessions }: BookingSectionWithModalProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleBook = (selectedSession: SessionRow) => {
    const targetUrl = `/intensivkurse?kurs=${selectedSession.source.kursId}`
    if (session?.user) {
      router.push(targetUrl)
    } else {
      router.push(`/login?callbackUrl=${encodeURIComponent(targetUrl)}`)
    }
  }

  return <BookingSection offer={offer} sessions={sessions} onBook={handleBook} />
}

export { BookingSectionWithModal }
