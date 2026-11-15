import { test, expect } from '@playwright/test'
import '../helpers/mock-registry'
import {
  resetMocks,
  setMockSupabaseClients,
  setMockResendResult,
} from '../helpers/mock-registry'
import { createMockSupabase } from '../helpers/mock-supabase'
import {
  formatChfRappen,
  formatSubscriptionPrice,
  formatOfferPrice,
} from '@/lib/pricing'
import {
  zurichLocalToUtcIso,
  utcIsoToZurichLocal,
} from '@/lib/utils/zurich-time'
import {
  formatFileSize,
  formatDateTime,
  formatDateOnly,
  formatDateIso,
} from '@/lib/utils/format'
import { validateInput } from '@/lib/utils/examUtils'
import { extractTextFromBuffer } from '@/lib/utils/extractEssayText'
import {
  mapKlassenstufeToAudienceIds,
  mapAvailability,
  mapKursRowToSessionDefinition,
  mapKursRowToExistingCourseCard,
  SUBJECT_TO_FACH,
} from '@/lib/kurse/mapper'
import { buildBookingAction, buildSessionRows } from '@/lib/kurse/session-row'
import { localizeContent } from '@/lib/i18n/localize-content'
import { buildPageMetadata } from '@/lib/seo'
import {
  logBookingRejected,
  logRateLimitRejected,
  logBookingUnexpectedError,
} from '@/lib/observability/logger'
import {
  formatStructuredRubric,
  buildCorrectionPrompt,
  buildMathStepsPrompt,
  buildQuickCorrectionPrompt,
} from '@/lib/ai/prompts'
import {
  dispatchDueOutboxMails,
  dispatchOutboxForAnmeldung,
} from '@/lib/mail/dispatch-outbox'
import { useAuthStore } from '@/store/useAuthStore'
import { useProgressStore } from '@/store/useProgressStore'
import type { KursDB } from '@/types/kurs-form'

test.describe('Core Utilities, Domain Mappers, Mail Outbox & Zustand Stores Suite', () => {
  test.beforeEach(() => {
    resetMocks()
  })

  test('pricing (`lib/pricing.ts`): formatChfRappen, formatSubscriptionPrice, and formatOfferPrice', () => {
    expect(formatChfRappen(65000)).toContain('650')
    expect(formatChfRappen(65050)).toContain('650.50')

    const subWithDiscount = formatSubscriptionPrice({
      lessons: 10,
      pricePerLessonRappen: 9000,
      discountPercent: 10,
      currency: 'CHF',
    })
    expect(subWithDiscount.value).toContain('810')
    expect(subWithDiscount.note).toContain('10% Rabatt')

    const subNoDiscount = formatSubscriptionPrice({
      lessons: 5,
      pricePerLessonRappen: 9000,
      currency: 'CHF',
    })
    expect(subNoDiscount.value).toContain('450')
    expect(subNoDiscount.note).not.toContain('Rabatt')

    const offerEarlyBird = formatOfferPrice({
      regularPriceRappen: 65000,
      earlyBirdPriceRappen: 59000,
      earlyBirdDeadline: '2026-09-01',
      currency: 'CHF',
    })
    expect(offerEarlyBird.value).toContain('590')
    expect(offerEarlyBird.note).toContain('Frühbucherrabatt')
    expect(offerEarlyBird.note).toContain('650')

    const offerRegular = formatOfferPrice({
      regularPriceRappen: 65000,
      currency: 'CHF',
      priceUnit: 'pro Kurswoche',
    })
    expect(offerRegular.value).toContain('650')
    expect(offerRegular.note).toBe('pro Kurswoche')
  })

  test('Zurich timezone conversion (`lib/utils/zurich-time.ts`): CET (+1) and CEST (+2) round-trips and validation', () => {
    // Summer time (CEST = UTC+2): 2026-08-01T09:00 in Zurich is 07:00 UTC
    const summerUtc = zurichLocalToUtcIso('2026-08-01T09:00')
    expect(summerUtc).toBe('2026-08-01T07:00:00.000Z')
    expect(utcIsoToZurichLocal(summerUtc)).toBe('2026-08-01T09:00')

    // Winter time (CET = UTC+1): 2026-01-15T09:00 in Zurich is 08:00 UTC
    const winterUtc = zurichLocalToUtcIso('2026-01-15T09:00')
    expect(winterUtc).toBe('2026-01-15T08:00:00.000Z')
    expect(utcIsoToZurichLocal(winterUtc)).toBe('2026-01-15T09:00')

    // Midnight boundary in Zurich
    const midnightUtc = zurichLocalToUtcIso('2026-12-01T00:00')
    expect(utcIsoToZurichLocal(midnightUtc)).toBe('2026-12-01T00:00')

    // Invalid input throws descriptive error
    expect(() => zurichLocalToUtcIso('not-a-datetime')).toThrow('Ungültiges datetime-local Format')
  })

  test('format & examUtils & extractEssayText (`lib/utils/*`)', async () => {
    expect(formatFileSize(null)).toBe('–')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')

    expect(formatDateOnly('2026-10-05T10:00:00Z')).toMatch(/05\.10\.2026/)
    expect(formatDateTime('2026-10-05T10:00:00Z')).toContain('2026')
    expect(formatDateIso(new Date('2026-10-05T15:20:00Z'))).toBe('2026-10-05')

    // validateInput normalizes comma vs dot decimal separators and whitespace
    expect(validateInput(undefined, undefined)).toBeNull()
    expect(validateInput('', '3.5')).toBe('empty')
    expect(validateInput('  3,5 ', 3.5)).toBe('correct')
    expect(validateInput('4.2', '3.5')).toBe('incorrect')

    // extractTextFromBuffer throws on unsupported MIME types
    await expect(
      extractTextFromBuffer(Buffer.from('test'), 'application/x-msdownload')
    ).rejects.toThrow('Nicht unterstütztes Dateiformat: application/x-msdownload')
  })

  test('course mappers & session-row (`lib/kurse/mapper.ts` & `lib/kurse/session-row.ts`)', () => {
    expect(SUBJECT_TO_FACH.ma).toBe('mathematik')
    expect(mapKlassenstufeToAudienceIds(['4. Klasse', '6. Klasse', '6. Klasse', 'Unbekannt'])).toEqual([
      '4',
      '6',
    ])

    const avail = mapAvailability({
      aktuelle_teilnehmer: 10,
      max_teilnehmer: 12,
      status: 'wenige-plaetze',
      updatedAt: '2026-05-01T00:00:00Z',
    })
    expect(avail).toEqual({
      status: 'wenige',
      bookedCount: 10,
      remainingPlaces: 2,
      updatedAt: '2026-05-01T00:00:00Z',
    })

    const validKursRow: KursDB = {
      id: 7,
      name: 'Herbstkurs Deutsch',
      fach: 'deutsch',
      beschreibung: 'Aufsatz und Textverständnis',
      detail_beschreibung: 'Detaillierte Infos',
      start_datum: '2026-10-05',
      end_datum: '2026-10-09',
      uhrzeit: '09:00 - 12:00',
      ort: 'Zürich HB',
      preis: 650,
      max_teilnehmer: 12,
      klassenstufen: ['6. Klasse'],
      lehrer: 'Frau Keller',
      highlights: ['Kleine Gruppen'],
      ist_aktiv: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'teacher-1',
    }

    const card = mapKursRowToExistingCourseCard(validKursRow)
    expect(card).not.toBeNull()
    expect(card?.regularPriceRappen).toBe(65000)
    expect(card?.subject).toBe('de')

    // Unknown location returns null (conservative exclusion)
    expect(
      mapKursRowToSessionDefinition({ ...validKursRow, ort: 'Basel SBB' })
    ).toBeNull()

    // buildBookingAction & buildSessionRows
    expect(buildBookingAction(undefined)).toMatchObject({ kind: 'disabled' })
    expect(
      buildBookingAction({ status: 'voll', bookedCount: 12, remainingPlaces: 0, updatedAt: '' })
    ).toEqual({ kind: 'disabled', label: 'Anmelden', disabledReason: 'Ausgebucht' })
    expect(
      buildBookingAction({ status: 'frei', bookedCount: 3, remainingPlaces: 9, updatedAt: '' })
    ).toEqual({ kind: 'modal', label: 'Anmelden' })

    const sessionDef = mapKursRowToSessionDefinition(validKursRow)!
    const rows = buildSessionRows(sessionDef ? [sessionDef] : [], new Map([[7, avail]]))
    expect(rows[0].bookingAction).toEqual({ kind: 'modal', label: 'Anmelden' })
  })

  test('i18n localization (`lib/i18n/localize-content.ts`), SEO (`lib/seo.ts`), Logger (`lib/observability/logger.ts`), and AI Prompts (`lib/ai/prompts.ts`)', () => {
    const baseContent = {
      title: 'Willkommen',
      tags: ['Mathe', 'Deutsch'],
      steps: [
        { id: 's1', label: 'Schritt 1', desc: 'Basis 1' },
        { id: 's2', label: 'Schritt 2', desc: 'Basis 2' },
      ],
    }

    // German locale is a zero-copy passthrough
    expect(localizeContent(baseContent, { en: { title: 'Welcome' } }, 'de')).toBe(baseContent)

    // English partial overlay merges arrays with stable `id` without losing untranslated items
    const enLocalized = localizeContent(
      baseContent,
      {
        en: {
          title: 'Welcome',
          steps: [{ id: 's2', label: 'Step 2' }],
        },
      },
      'en'
    )
    expect(enLocalized.title).toBe('Welcome')
    expect(enLocalized.steps[0]).toEqual({ id: 's1', label: 'Schritt 1', desc: 'Basis 1' })
    expect(enLocalized.steps[1]).toEqual({ id: 's2', label: 'Step 2', desc: 'Basis 2' })

    // SEO metadata
    const meta = buildPageMetadata({
      title: 'Kurse 6. Klasse',
      description: 'ZAP Vorbereitung',
      path: '/kurse/6-klasse',
      locale: 'de',
    })
    expect(meta.alternates?.canonical).toBe('/de/kurse/6-klasse')
    expect(meta.openGraph?.url).toBe('/de/kurse/6-klasse')

    // Structured JSON logger
    const loggedLines: string[] = []
    const origLog = console.log
    const origWarn = console.warn
    const origErr = console.error
    console.log = (line: string) => loggedLines.push(line)
    console.warn = (line: string) => loggedLines.push(line)
    console.error = (line: string) => loggedLines.push(line)
    try {
      logBookingRejected({ kursId: 1, reason: 'course_full' })
      logRateLimitRejected({ kursId: 2 })
      logBookingUnexpectedError({ kursId: 3, message: 'db timeout' })
      expect(loggedLines).toHaveLength(3)
      expect(JSON.parse(loggedLines[0])).toMatchObject({
        level: 'info',
        event: 'booking_rejected',
        kursId: 1,
        reason: 'course_full',
      })
      expect(JSON.parse(loggedLines[1])).toMatchObject({
        level: 'warn',
        event: 'rate_limit_rejected',
        kursId: 2,
      })
      expect(JSON.parse(loggedLines[2])).toMatchObject({
        level: 'error',
        event: 'booking_unexpected_error',
        kursId: 3,
        message: 'db timeout',
      })
    } finally {
      console.log = origLog
      console.warn = origWarn
      console.error = origErr
    }

    // AI Prompts
    const formattedRubric = formatStructuredRubric({
      criteria: [{ id: 'c1', name: 'Aufbau', max_points: 10, description: 'Gliederung' }],
    })
    expect(formattedRubric).toContain('1. **Aufbau** (max. 10 Punkte)')

    const corrPrompt = buildCorrectionPrompt({
      essayText: 'Ein Sommertag.',
      rubricContent: formattedRubric,
      rubricType: 'structured',
      essayTitle: 'Mein Sommer',
      subject: 'Deutsch',
      classLevel: '6. Klasse',
    })
    expect(corrPrompt).toContain('Mein Sommer')
    expect(corrPrompt).toContain('6. Klasse')

    const mathPrompt = buildMathStepsPrompt('Löse nach x auf', 'x = 5', '2x + 3 = 13')
    expect(mathPrompt.user).toContain('2x + 3 = 13')
    expect(mathPrompt.user).toContain('x = 5')

    const quickPrompt = buildQuickCorrectionPrompt({
      essayText: 'Mein Text',
      criteria: [],
      essayTitle: 'Titel',
      subject: 'Deutsch',
    })
    expect(quickPrompt).toContain('1. Grammatik')
  })

  test('mail outbox dispatcher (`lib/mail/dispatch-outbox.ts`): idempotent sending, exponential backoff, and missing context handling', async () => {
    const mockDb = createMockSupabase({
      tables: {
        mail_outbox: (call) => {
          if (call.operation === 'select') {
            return {
              data: [
                {
                  id: 'outbox-1',
                  anmeldung_id: 'anm-valid-1',
                  template_key: 'booking_confirmation',
                  attempts: 0,
                  max_attempts: 5,
                },
                {
                  id: 'outbox-exhausted',
                  anmeldung_id: 'anm-exhausted',
                  template_key: 'booking_confirmation',
                  attempts: 5,
                  max_attempts: 5,
                },
              ],
            }
          }
          return { data: null }
        },
        intensivwoche_anmeldungen: {
          select: {
            data: {
              child_firstname: 'Leo',
              child_lastname: 'Muster',
              parent_email: 'parent@example.com',
              kurs_id: 10,
              booked_price_rappen: 65000,
              currency: 'CHF',
            },
          },
        },
        intensivwoche_kurse: {
          select: {
            data: {
              name: 'Herbstkurs',
              fach: 'mathematik',
              start_datum: '2026-10-05',
              end_datum: '2026-10-09',
              uhrzeit: '09:00 - 12:00',
              ort: 'Zürich HB',
            },
          },
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    // 1. Successful delivery marks status='sent' and skips rows where attempts >= max_attempts
    setMockResendResult({ data: { id: 're_msg_999' }, error: null })
    const resSent = await dispatchDueOutboxMails()
    expect(resSent).toEqual({
      processed: 1,
      sent: 1,
      failed: 0,
      stillPending: 0,
    })

    // 2. Transient Resend failure increments attempts, schedules backoff, and returns stillPending=1 when attempts < max_attempts
    mockDb.calls.length = 0
    setMockResendResult({ data: null, error: { message: 'Resend rate limit exceeded' } })
    const resRetry = await dispatchDueOutboxMails()
    expect(resRetry).toEqual({
      processed: 1,
      sent: 0,
      failed: 0,
      stillPending: 1,
    })

    const retryUpdate = mockDb.calls.find(
      (c) => c.kind === 'from' && c.target === 'mail_outbox' && c.operation === 'update'
    )
    expect(retryUpdate?.payload).toMatchObject({
      status: 'failed',
      attempts: 1,
      last_error: 'Resend rate limit exceeded',
    })

    // 3. dispatchOutboxForAnmeldung is best-effort and never throws if row is missing
    await expect(dispatchOutboxForAnmeldung('anm-nonexistent')).resolves.toBeUndefined()
  })

  test('Zustand stores (`store/useAuthStore.ts` & `store/useProgressStore.ts`)', () => {
    // 1. useAuthStore role flags & clear()
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)

    useAuthStore.getState().setSession({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@zap.ch',
        role: 'admin',
      },
      supabaseAccessToken: 'tok_admin',
    })
    expect(useAuthStore.getState().isAdmin).toBe(true)
    expect(useAuthStore.getState().isContentManager).toBe(true)
    expect(useAuthStore.getState().isStudent).toBe(false)
    expect(useAuthStore.getState().status).toBe('authenticated')

    useAuthStore.getState().setSession({
      user: {
        id: 'teacher-1',
        name: 'Teacher',
        email: 't@zap.ch',
        role: 'lehrperson',
      },
      supabaseAccessToken: 'tok_teacher',
    })
    expect(useAuthStore.getState().isAdmin).toBe(false)
    expect(useAuthStore.getState().isContentManager).toBe(true)

    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)

    // 2. useProgressStore localStorage & answer scoping
    const storageMap = new Map<string, string>()
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storageMap.set(k, v)
      },
      removeItem: (k: string) => {
        storageMap.delete(k)
      },
      clear: () => storageMap.clear(),
      key: () => null,
      length: 0,
    }

    useProgressStore.getState().setAuthData(null, null)
    useProgressStore.getState().updateAnswer('exam-1', 'q1', '42')
    useProgressStore.getState().updateAnswer('exam-2', 'q1', '99')

    expect(useProgressStore.getState().getAnswer('exam-1', 'q1')).toBe('42')
    expect(useProgressStore.getState().getAnswer('exam-2', 'q1')).toBe('99')

    useProgressStore.getState().resetExam('exam-1')
    expect(useProgressStore.getState().getAnswer('exam-1', 'q1')).toBeUndefined()
    expect(useProgressStore.getState().getAnswer('exam-2', 'q1')).toBe('99')
  })
})
