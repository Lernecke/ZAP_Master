'use client'

// Schritt 8: öffnet die bestehende Buchungsmodalität (app/(public)/kurse/anmeldung-modal.tsx) für
// Bestandskurse direkt auf den neuen Marketingseiten -- keine zweite Buchungsmodalität (Abschnitt
// 1b des Architektur-Briefings). Gleiche Server Action, gleiche book_intensivwoche_kurs()-RPC.

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import type { ExistingCourseCardModel } from '@/types/marketing'
import { AnmeldungModal } from '@/app/(public)/kurse/anmeldung-modal'
import { ExistingCourseSection } from '@/app/components/kurse/existing-course-section'
import { SUBJECT_TO_FACH } from '@/lib/kurse/mapper'

interface ExistingCourseBookingProps {
  courses: ExistingCourseCardModel[]
}

function ExistingCourseBooking({ courses }: ExistingCourseBookingProps) {
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState<ExistingCourseCardModel | null>(null)

  return (
    <>
      <ExistingCourseSection courses={courses} onBook={setSelectedCourse} />
      {selectedCourse ? (
        <AnmeldungModal
          kurs={{
            id: selectedCourse.sourceKursId,
            name: selectedCourse.title,
            fach: SUBJECT_TO_FACH[selectedCourse.subject],
            startDatum: selectedCourse.session.startAt ?? '',
            endDatum: selectedCourse.session.endAt ?? '',
            uhrzeit: selectedCourse.session.timeLabel,
            ort: selectedCourse.session.standort,
            preis: selectedCourse.regularPriceRappen / 100,
            klassenstufen: selectedCourse.classLabels,
          }}
          onClose={() => {
            setSelectedCourse(null)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}

export { ExistingCourseBooking }
