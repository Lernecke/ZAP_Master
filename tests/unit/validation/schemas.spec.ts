import { test, expect } from '@playwright/test'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/types/auth'
import { intensivwocheAnmeldungSchema } from '@/types/intensivwoche'
import { createChildAccountSchema } from '@/types/family'
import {
  createSignedUploadUrlSchema,
  gradeEssaySchema,
  createStructuredRubricSchema,
} from '@/types/aufsatz'
import { updateProfileSchema, updateThemeSchema } from '@/types/profil'
import { updateUserRoleSchema } from '@/types/admin'
import { kursFormSchema } from '@/types/kurs-form'
import { offerEditionFormSchema, courseSessionFormSchema } from '@/types/kurs-edition'
import { releaseFormSchema } from '@/types/kurs-tagesfreigabe'
import { workEntryFormSchema, rateAgreementFormSchema } from '@/types/kurs-arbeitszeit'
import { expenseEntryFormSchema, financialAdjustmentFormSchema } from '@/types/kurs-finanzen'
import { grantAccessFormSchema, isMaterialAreaId } from '@/types/kurs-materialien'
import { createMaterialSchema } from '@/types/material'
import { courseFormSchema, occurrenceFormSchema, COURSE_LOCATIONS } from '@/types/auffrischungskurs'
import { contactFormSchema } from '@/types/contact-form'

test.describe('Comprehensive Zod Schema Validation Suite (`types/*`)', () => {
  test('auth schemas (`types/auth.ts`): loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success
    ).toBe(true)
    expect(
      loginSchema.safeParse({ email: 'invalid-email', password: 'secret' }).success
    ).toBe(false)
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: '12345' }).success
    ).toBe(false)

    // registerSchema password confirmation refinement & name length limits
    expect(
      registerSchema.safeParse({
        email: 'parent@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Anna',
        lastName: 'Muster',
      }).success
    ).toBe(true)

    const mismatch = registerSchema.safeParse({
      email: 'parent@example.com',
      password: 'password123',
      confirmPassword: 'differentPassword',
      firstName: 'Anna',
      lastName: 'Muster',
    })
    expect(mismatch.success).toBe(false)
    if (!mismatch.success) {
      expect(mismatch.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwörter stimmen nicht überein'
      )
    }

    expect(
      registerSchema.safeParse({
        email: 'parent@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'A'.repeat(51),
        lastName: 'Muster',
      }).success
    ).toBe(false)

    expect(forgotPasswordSchema.safeParse({ email: 'reset@example.com' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false)

    expect(
      resetPasswordSchema.safeParse({ password: 'newpassword', confirmPassword: 'newpassword' })
        .success
    ).toBe(true)
    expect(
      resetPasswordSchema.safeParse({ password: 'newpassword', confirmPassword: 'wrong' }).success
    ).toBe(false)
  })

  test('intensivwocheAnmeldungSchema (`types/intensivwoche.ts`): validates phone regex, gender enum, and notes limit', () => {
    const validBase = {
      kurs_id: '42',
      child_firstname: 'Lukas',
      child_lastname: 'Müller',
      child_class_level: '6. Klasse',
      child_gender: 'm' as const,
      parent_email: 'eltern@example.ch',
      parent_phone: '+41 79 123 45 67',
      notes: 'Keine Allergien',
    }
    expect(intensivwocheAnmeldungSchema.safeParse(validBase).success).toBe(true)

    // Rejects letters/scripts in phone number
    expect(
      intensivwocheAnmeldungSchema.safeParse({
        ...validBase,
        parent_phone: '+41 79 ABC <script>',
      }).success
    ).toBe(false)

    // Rejects invalid gender
    expect(
      intensivwocheAnmeldungSchema.safeParse({
        ...validBase,
        child_gender: 'x',
      }).success
    ).toBe(false)

    // Rejects notes > 500 chars
    expect(
      intensivwocheAnmeldungSchema.safeParse({
        ...validBase,
        notes: 'X'.repeat(501),
      }).success
    ).toBe(false)
  })

  test('createChildAccountSchema (`types/family.ts`): trims whitespace and requires non-empty names and valid email', () => {
    const parsed = createChildAccountSchema.safeParse({
      firstName: '  Mia  ',
      lastName: '  Muster ',
      email: '  mia@example.com ',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.firstName).toBe('Mia')
      expect(parsed.data.lastName).toBe('Muster')
      expect(parsed.data.email).toBe('mia@example.com')
    }

    expect(
      createChildAccountSchema.safeParse({
        firstName: '   ',
        lastName: 'Muster',
        email: 'mia@example.com',
      }).success
    ).toBe(false)
  })

  test('essay & rubric schemas (`types/aufsatz.ts`): MIME whitelist, 10MB cap, Swiss grades 1-6, and rubric criteria', () => {
    expect(
      createSignedUploadUrlSchema.safeParse({
        fileName: 'aufsatz.pdf',
        fileType: 'application/pdf',
        fileSize: 10_485_760,
      }).success
    ).toBe(true)

    expect(
      createSignedUploadUrlSchema.safeParse({
        fileName: 'aufsatz.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 500_000,
      }).success
    ).toBe(true)

    // Rejects legacy .doc, executables, and files > 10MB
    expect(
      createSignedUploadUrlSchema.safeParse({
        fileName: 'legacy.doc',
        fileType: 'application/msword',
        fileSize: 1024,
      }).success
    ).toBe(false)
    expect(
      createSignedUploadUrlSchema.safeParse({
        fileName: 'too-big.pdf',
        fileType: 'application/pdf',
        fileSize: 10_485_761,
      }).success
    ).toBe(false)

    // gradeEssaySchema: requires at least grade (1-6) or non-empty feedback
    expect(gradeEssaySchema.safeParse({ grade: 5.5 }).success).toBe(true)
    expect(gradeEssaySchema.safeParse({ feedback: 'Guter Aufbau!' }).success).toBe(true)
    expect(gradeEssaySchema.safeParse({ grade: 0.5 }).success).toBe(false)
    expect(gradeEssaySchema.safeParse({ grade: 6.5 }).success).toBe(false)
    expect(gradeEssaySchema.safeParse({ feedback: '   ' }).success).toBe(false)

    // createStructuredRubricSchema
    expect(
      createStructuredRubricSchema.safeParse({
        title: 'Aufsatz Bewertung',
        criteria: [{ name: 'Inhalt', description: 'Roter Faden und Argumentation' }],
      }).success
    ).toBe(true)
    expect(
      createStructuredRubricSchema.safeParse({
        title: 'Aufsatz Bewertung',
        criteria: [],
      }).success
    ).toBe(false)
  })

  test('profile & admin schemas (`types/profil.ts`, `types/admin.ts`)', () => {
    expect(
      updateProfileSchema.safeParse({
        first_name: 'Max',
        last_name: 'Muster',
        bio: 'Kurzbio',
      }).success
    ).toBe(true)
    expect(
      updateProfileSchema.safeParse({
        first_name: '',
        last_name: 'Muster',
      }).success
    ).toBe(false)

    expect(updateThemeSchema.safeParse({ theme: 'dark' }).success).toBe(true)
    expect(updateThemeSchema.safeParse({ theme: 'neon' }).success).toBe(false)

    expect(
      updateUserRoleSchema.safeParse({
        userId: '11111111-2222-4333-8444-555555555555',
        newRole: 'lehrperson',
      }).success
    ).toBe(true)
    expect(
      updateUserRoleSchema.safeParse({
        userId: 'not-a-uuid',
        newRole: 'admin',
      }).success
    ).toBe(false)
    expect(
      updateUserRoleSchema.safeParse({
        userId: '11111111-2222-4333-8444-555555555555',
        newRole: 'superadmin',
      }).success
    ).toBe(false)
  })

  test('kursFormSchema (`types/kurs-form.ts`) & offerEditionFormSchema / courseSessionFormSchema (`types/kurs-edition.ts`)', () => {
    expect(
      kursFormSchema.safeParse({
        name: 'Intensivwoche Mathe',
        fach: 'mathematik',
        beschreibung: 'Gezielte Prüfungsvorbereitung',
        start_datum: '2026-10-05',
        end_datum: '2026-10-09',
        uhrzeit: '09:00 - 12:00',
        ort: 'Zürich HB',
        preis: 650,
        max_teilnehmer: 12,
        klassenstufen: ['6. Klasse'],
        lehrer: 'Dr. Müller',
      }).success
    ).toBe(true)

    // offerEditionFormSchema early-bird refinements
    const baseEdition = {
      schoolYear: '2026/27',
      publicTitle: 'Herbst-Intensivwoche',
      tagline: 'Optimal vorbereitet an die ZAP',
      description: 'Fünf Tage intensives Training in Kleingruppen.',
      regularPriceChf: 650,
      earlyBirdEnabled: true,
      earlyBirdPriceChf: 590,
      earlyBirdDeadline: '2026-09-01',
      status: 'published' as const,
    }
    expect(offerEditionFormSchema.safeParse(baseEdition).success).toBe(true)

    // Early bird >= regular price must fail
    expect(
      offerEditionFormSchema.safeParse({
        ...baseEdition,
        earlyBirdPriceChf: 650,
      }).success
    ).toBe(false)

    // Early bird enabled without deadline must fail
    expect(
      offerEditionFormSchema.safeParse({
        ...baseEdition,
        earlyBirdDeadline: '',
      }).success
    ).toBe(false)

    // courseSessionFormSchema date ordering refinement
    const validSession = {
      fach: 'deutsch' as const,
      lehrer: 'Frau Meier',
      startDatum: '2026-10-05',
      endDatum: '2026-10-09',
      uhrzeit: '09:00 - 12:00',
      standort: 'Zürich HB' as const,
      maxTeilnehmer: 15,
      registrationStatus: 'bookable' as const,
      deliveryModes: ['onsite' as const],
    }
    expect(courseSessionFormSchema.safeParse(validSession).success).toBe(true)
    expect(
      courseSessionFormSchema.safeParse({
        ...validSession,
        endDatum: '2026-10-01',
      }).success
    ).toBe(false)
  })

  test('releaseFormSchema (`types/kurs-tagesfreigabe.ts`), workEntryFormSchema & rateAgreementFormSchema (`types/kurs-arbeitszeit.ts`)', () => {
    expect(
      releaseFormSchema.safeParse({
        mode: 'now',
        selectedItems: [{ kind: 'exercise', sourceId: '10' }],
      }).success
    ).toBe(true)

    // Scheduled mode requires opensAt < closesAt
    expect(
      releaseFormSchema.safeParse({
        mode: 'scheduled',
        opensAt: '2026-10-05T12:00',
        closesAt: '2026-10-05T08:00',
        selectedItems: [{ kind: 'exercise', sourceId: '10' }],
      }).success
    ).toBe(false)

    expect(
      workEntryFormSchema.safeParse({
        activityType: 'course_teaching',
        workDate: '2026-10-05',
        durationMinutes: 180,
      }).success
    ).toBe(true)
    expect(
      workEntryFormSchema.safeParse({
        activityType: 'course_teaching',
        workDate: '2026-10-05',
        durationMinutes: 721, // > 12h cap
      }).success
    ).toBe(false)

    expect(
      rateAgreementFormSchema.safeParse({
        hourlyRateChf: 85,
        validFrom: '2026-09-01',
      }).success
    ).toBe(true)
    expect(
      rateAgreementFormSchema.safeParse({
        hourlyRateChf: 550, // > 500 cap
        validFrom: '2026-09-01',
      }).success
    ).toBe(false)
  })

  test('finanzen, materialien, material, auffrischungskurs, and contact schemas', () => {
    // expenseEntryFormSchema & financialAdjustmentFormSchema
    expect(
      expenseEntryFormSchema.safeParse({
        category: 'room',
        amountChf: 450,
        serviceDate: '2026-10-05',
      }).success
    ).toBe(true)
    expect(
      financialAdjustmentFormSchema.safeParse({
        amountChf: 0,
        reason: 'Korrektur Buchung',
      }).success
    ).toBe(false)
    expect(
      financialAdjustmentFormSchema.safeParse({
        amountChf: -120,
        reason: 'Kulanzrabatt nachträglich',
      }).success
    ).toBe(true)

    // grantAccessFormSchema & isMaterialAreaId
    expect(grantAccessFormSchema.safeParse({ email: '  student@example.com ' }).success).toBe(true)
    expect(isMaterialAreaId('langzeitgymi')).toBe(true)
    expect(isMaterialAreaId('unknown_area')).toBe(false)

    // createMaterialSchema
    expect(
      createMaterialSchema.safeParse({
        name: 'Theorieblatt Brüche',
        subject_id: 1,
        type: 'link',
        url: 'https://example.com/brueche.pdf',
      }).success
    ).toBe(true)
    expect(
      createMaterialSchema.safeParse({
        name: 'Theorieblatt Brüche',
        subject_id: 1,
        type: 'link',
        url: 'not-a-valid-url',
      }).success
    ).toBe(false)

    // courseFormSchema & occurrenceFormSchema
    expect(
      courseFormSchema.safeParse({
        title: 'Auffrischungskurs Mathe',
        description: 'Wiederholung der wichtigsten Themen vor der Prüfung.',
        priceChf: 320,
        location: COURSE_LOCATIONS[0],
        paymentMethod: 'Bar vor Ort',
      }).success
    ).toBe(true)
    expect(
      occurrenceFormSchema.safeParse({
        startsAt: '2026-10-05T09:00:00Z',
        endsAt: '2026-10-05T12:00:00Z',
      }).success
    ).toBe(true)
    expect(
      occurrenceFormSchema.safeParse({
        startsAt: '2026-10-05T12:00:00Z',
        endsAt: '2026-10-05T09:00:00Z',
      }).success
    ).toBe(false)

    // contactFormSchema
    expect(
      contactFormSchema.safeParse({
        preferredContact: 'email',
        name: 'Petra Muster',
        email: 'petra@example.com',
        message: 'Ich habe eine Frage zum Herbstkurs.',
      }).success
    ).toBe(true)
    expect(
      contactFormSchema.safeParse({
        preferredContact: 'email',
        name: 'Petra Muster',
        email: 'petra@example.com',
        message: '',
      }).success
    ).toBe(false)
  })
})
