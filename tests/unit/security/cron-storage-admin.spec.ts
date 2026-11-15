import { test, expect } from '@playwright/test'
import '../helpers/mock-registry'
import {
  resetMocks,
  setMockSession,
  setMockCookie,
  getMockCookies,
  getDeletedCookies,
  setMockSupabaseClients,
} from '../helpers/mock-registry'
import { createMockSupabase } from '../helpers/mock-supabase'
import { NextRequest } from 'next/server'
import { POST as mailOutboxProcessPOST } from '@/app/api/mail-outbox/process/route'
import { createBucketSignedUploadUrl } from '@/lib/storage/signed-upload'
import {
  createSignedUploadUrl,
  saveEssayMetadata,
  updateEssay,
  deleteEssay,
} from '@/app/(dashboard)/aufsaetze/actions'
import {
  createSignedRubricUploadUrl,
  saveRubricPdf,
  deleteRubric,
} from '@/app/(dashboard)/dashboard/aufsaetze/rubriken/actions'
import { renderBookingConfirmation } from '@/lib/mail/templates/booking-confirmation'
import {
  loginAdminAction,
  checkAdminAuthAction,
  logoutAdminAction,
  getAdminPaymentsDataAction,
  getAdminUsersDataAction,
  manuallyMarkPaymentSucceededAction,
} from '@/app/admin/actions'
import {
  updateUserRole,
  deleteUser,
} from '@/app/(dashboard)/dashboard/admin/benutzer/actions'
import {
  createChildAccountAction,
  regenerateChildMagicLinkAction,
  deleteChildAccountAction,
} from '@/app/(dashboard)/profil/family-actions'
import { getCoursesAndMaterialsAction } from '@/app/(dashboard)/profil/actions'
import { createRequest } from '@/app/(dashboard)/dashboard/mentorship/actions'
import { updateMaterial } from '@/app/(dashboard)/dashboard/materialien/actions'
import { getKurse, getKurs } from '@/app/(dashboard)/dashboard/kurse/actions'
import { submitIntensivwocheAnmeldung } from '@/app/(public)/kurse/actions'
import { getMailOutboxRows, processMailOutboxNow } from '@/app/(dashboard)/dashboard/mail-outbox/actions'
import { getAfterCallbacks } from '../helpers/mock-registry'

test.describe('Cron, Storage, XSS, Admin & IDOR Security Suite', () => {
  test.beforeEach(() => {
    resetMocks()
  })

  test.describe('Cron Authentication (`POST /api/mail-outbox/process`)', () => {
    const origCronSecret = process.env.MAIL_OUTBOX_CRON_SECRET

    test.afterAll(() => {
      process.env.MAIL_OUTBOX_CRON_SECRET = origCronSecret
    })

    test('fails closed with HTTP 401 when MAIL_OUTBOX_CRON_SECRET is unset or empty', async () => {
      delete process.env.MAIL_OUTBOX_CRON_SECRET

      const reqNoHeader = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
      })
      expect((await mailOutboxProcessPOST(reqNoHeader)).status).toBe(401)

      const reqEmptyBearer = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
        headers: { authorization: 'Bearer ' },
      })
      expect((await mailOutboxProcessPOST(reqEmptyBearer)).status).toBe(401)
    })

    test('rejects missing header, Basic auth, wrong-length secret, and same-length wrong secret with HTTP 401', async () => {
      process.env.MAIL_OUTBOX_CRON_SECRET = 'cron_secret_exact_32_bytes_12345'

      const missingHeader = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
      })
      expect((await mailOutboxProcessPOST(missingHeader)).status).toBe(401)

      const basicAuth = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
        headers: { authorization: 'Basic cron_secret_exact_32_bytes_12345' },
      })
      expect((await mailOutboxProcessPOST(basicAuth)).status).toBe(401)

      const wrongLength = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
        headers: { authorization: 'Bearer short_secret' },
      })
      expect((await mailOutboxProcessPOST(wrongLength)).status).toBe(401)

      // Same byte length (32 bytes), differs in last character
      const sameLengthWrong = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
        headers: { authorization: 'Bearer cron_secret_exact_32_bytes_1234X' },
      })
      expect((await mailOutboxProcessPOST(sameLengthWrong)).status).toBe(401)
    })

    test('authorizes valid Bearer token via timingSafeEqual and dispatches due outbox emails (HTTP 200)', async () => {
      process.env.MAIL_OUTBOX_CRON_SECRET = 'cron_secret_exact_32_bytes_12345'

      const mockDb = createMockSupabase({
        tables: {
          mail_outbox: { select: { data: [] } },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const validReq = new NextRequest('http://localhost:3000/api/mail-outbox/process', {
        method: 'POST',
        headers: { authorization: 'Bearer cron_secret_exact_32_bytes_12345' },
      })
      const res = await mailOutboxProcessPOST(validReq)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ processed: 0, sent: 0, failed: 0, stillPending: 0 })
    })
  })

  test.describe('Storage Upload Path Traversal & Sanitization (`lib/storage/signed-upload.ts`)', () => {
    test('neutralizes directory traversal sequences, slashes, null bytes, and shell metacharacters', async () => {
      const mockDb = createMockSupabase()
      setMockSupabaseClients({ admin: mockDb })

      const res = await createBucketSignedUploadUrl({
        bucket: 'student-essays',
        pathPrefix: 'aufsaetze',
        userId: 'user-student-1',
        fileName: '../../../etc/passwd;rm -rf /\0\\evil.pdf',
      })

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.path.startsWith('aufsaetze/user-student-1/')).toBe(true)
        // Must not contain any path traversal or extra directory separators after userId/
        const relativeAfterUser = res.data.path.slice('aufsaetze/user-student-1/'.length)
        expect(relativeAfterUser).not.toContain('/')
        expect(relativeAfterUser).not.toContain('\\')
        expect(relativeAfterUser).not.toContain('\0')
        expect(relativeAfterUser).not.toContain(';')
      }
    })

    test('preserves German umlauts (äöüÄÖÜß) and truncates excessively long filenames to maxFileNameLength', async () => {
      const mockDb = createMockSupabase()
      setMockSupabaseClients({ admin: mockDb })

      const longUmlautName = `Prüfungsaufsatz_Überarbeitung_Größe_${'A'.repeat(150)}.pdf`
      const res = await createBucketSignedUploadUrl({
        bucket: 'student-essays',
        pathPrefix: 'aufsaetze',
        userId: 'user-student-1',
        fileName: longUmlautName,
        maxFileNameLength: 60,
      })

      expect(res.success).toBe(true)
      if (res.success) {
        const sanitizedPart = res.data.path.split('--')[1]
        expect(sanitizedPart.length).toBe(60)
        expect(sanitizedPart).toContain('Prüfungsaufsatz_Überarbeitung_Größe_')
      }
    })
  })

  test.describe('Student Essays & Teacher Rubrics Ownership & Path Spoofing Guards', () => {
    test('saveEssayMetadata blocks cross-user filePath spoofing and enforces student role', async () => {
      // Teacher cannot submit student essays
      setMockSession({
        user: { id: 'teacher-1', email: 't@example.com', name: 'Teacher', role: 'lehrperson' },
        supabaseAccessToken: 'tok_teacher',
      })
      const teacherAttempt = await createSignedUploadUrl('essay.pdf', 'application/pdf', 1024)
      expect(teacherAttempt).toEqual({
        success: false,
        error: 'Nur Schüler können Aufsätze abgeben.',
      })

      // Student attempting to register another student's storage path
      setMockSession({
        user: { id: 'student-1', email: 's1@example.com', name: 'Student 1', role: 'user' },
        supabaseAccessToken: 'tok_s1',
      })
      const mockDb = createMockSupabase()
      setMockSupabaseClients({ authenticated: mockDb, admin: mockDb })

      const spoofAttempt = await saveEssayMetadata(
        'aufsaetze/student-victim-2/uuid--essay.pdf',
        'essay.pdf',
        2048,
        'application/pdf',
        'Mein Aufsatz',
        'Deutsch'
      )
      expect(spoofAttempt).toEqual({
        success: false,
        error: 'Ungültiger Dateipfad.',
      })
      expect(mockDb.calls).toHaveLength(0)
    })

    test('updateEssay and deleteEssay block modifications once an essay is submitted (draft-only guard)', async () => {
      setMockSession({
        user: { id: 'student-1', email: 's1@example.com', name: 'Student 1', role: 'user' },
        supabaseAccessToken: 'tok_s1',
      })
      const mockDb = createMockSupabase({
        tables: {
          student_essays: {
            select: {
              data: {
                id: 'essay-submitted-1',
                file_path: 'aufsaetze/student-1/file.pdf',
                status: 'submitted',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb, admin: mockDb })

      const updateRes = await updateEssay('essay-submitted-1', { title: 'Neuer Titel' })
      expect(updateRes).toEqual({
        success: false,
        error: 'Nur Entwürfe können bearbeitet werden.',
      })

      const deleteRes = await deleteEssay('essay-submitted-1')
      expect(deleteRes).toEqual({
        success: false,
        error: 'Nur Entwürfe können gelöscht werden.',
      })
    })

    test('rubric actions enforce teacher/admin role, 5MB limit, path prefix ownership, and creator ownership on delete', async () => {
      // Student blocked from rubrics
      setMockSession({
        user: { id: 'student-1', email: 's1@example.com', name: 'Student', role: 'user' },
        supabaseAccessToken: 'tok_s1',
      })
      expect(await createSignedRubricUploadUrl('rubrik.pdf', 1000)).toEqual({
        success: false,
        error: 'Nur Lehrpersonen haben Zugriff.',
      })

      // Teacher blocked on > 5MB file and cross-teacher path spoofing
      setMockSession({
        user: { id: 'teacher-1', email: 't1@example.com', name: 'Teacher 1', role: 'lehrperson' },
        supabaseAccessToken: 'tok_t1',
      })
      expect(await createSignedRubricUploadUrl('huge.pdf', 6 * 1024 * 1024)).toEqual({
        success: false,
        error: 'Datei zu gross (max. 5 MB).',
      })

      expect(
        await saveRubricPdf('rubriken/other-teacher-2/uuid--rubrik.pdf', 'rubrik.pdf', 'Titel')
      ).toEqual({
        success: false,
        error: 'Ungültiger Dateipfad.',
      })

      // Teacher 1 cannot delete a rubric created by Teacher 2
      const mockDb = createMockSupabase({
        tables: {
          correction_rubrics: {
            select: {
              data: {
                id: 'rub-2',
                type: 'pdf',
                pdf_path: 'rubriken/teacher-2/r.pdf',
                created_by: 'teacher-2',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb, admin: mockDb })

      const delRes = await deleteRubric('rub-2')
      expect(delRes).toEqual({
        success: false,
        error: 'Keine Berechtigung.',
      })
    })
  })

  test.describe('Email HTML XSS Escaping & PII Minimization (`lib/mail/templates/booking-confirmation.ts`)', () => {
    test('escapes all HTML special characters (<, >, &, ", \') in user-supplied fields and omits sensitive PII', () => {
      const rendered = renderBookingConfirmation({
        parentEmail: 'parent@example.com',
        childFirstname: '<script>alert("xss")</script>',
        childLastname: 'O\'Connor & "Sons"',
        kursName: '<img src=x onerror=alert(1)>',
        fach: 'mathematik',
        startDatum: '2026-10-05',
        endDatum: '2026-10-09',
        uhrzeit: '09:00 - 12:00',
        ort: 'Zürich <Bürkliplatz>',
        bookedPriceRappen: 65000,
        currency: 'CHF',
      })

      expect(rendered.to).toBe('parent@example.com')
      expect(rendered.html).not.toContain('<script>')
      expect(rendered.html).not.toContain('<img src=x')
      expect(rendered.html).not.toContain('<Bürkliplatz>')
      expect(rendered.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
      expect(rendered.html).toContain('O&#39;Connor &amp; &quot;Sons&quot;')
      expect(rendered.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
      expect(rendered.html).toContain('Zürich &lt;Bürkliplatz&gt;')
      expect(rendered.html).toMatch(/CHF\s+650/)
    })
  })

  test.describe('Admin Dashboard Actions (`app/admin/actions.ts` & `app/(dashboard)/dashboard/admin/benutzer/actions.ts`)', () => {
    const origAdminPassword = process.env.ADMIN_PAYMENTS_PASSWORD

    test.afterAll(() => {
      process.env.ADMIN_PAYMENTS_PASSWORD = origAdminPassword
    })

    test('enforces password login, sets httpOnly cookie, and rejects unauthenticated access to payment/user actions', async () => {
      process.env.ADMIN_PAYMENTS_PASSWORD = 'super_secret_admin_pw'

      // Unauthenticated requests are rejected
      expect(await checkAdminAuthAction()).toBe(false)
      expect(await getAdminPaymentsDataAction()).toEqual({
        payments: [],
        error: 'Nicht authentifiziert',
      })
      expect(await getAdminUsersDataAction()).toEqual({
        users: [],
        error: 'Nicht authentifiziert',
      })
      expect(await manuallyMarkPaymentSucceededAction('pay-1')).toEqual({
        success: false,
        error: 'Nicht authentifiziert',
      })

      // Wrong password rejected
      const badLogin = await loginAdminAction('wrong_pw')
      expect(badLogin).toEqual({ success: false, error: 'Falsches Passwort.' })
      expect(await checkAdminAuthAction()).toBe(false)

      // Correct password sets httpOnly cookie
      const okLogin = await loginAdminAction('super_secret_admin_pw')
      expect(okLogin).toEqual({ success: true })
      expect(await checkAdminAuthAction()).toBe(true)

      const cookie = getMockCookies().get('admin_payments_auth_session')
      expect(cookie?.value).toBe('authenticated')
      expect(cookie?.options).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })

      // Logout deletes cookie
      await logoutAdminAction()
      expect(getDeletedCookies()).toContain('admin_payments_auth_session')
      expect(await checkAdminAuthAction()).toBe(false)
    })

    test('manuallyMarkPaymentSucceededAction updates payment via RPC when admin cookie is valid', async () => {
      setMockCookie('admin_payments_auth_session', 'authenticated')
      const mockDb = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: {
                id: 'pay-manual-1',
                stripe_checkout_session_id: 'cs_manual_1',
                stripe_payment_intent_id: 'pi_manual_1',
                anmeldung_id: 'anm-manual-1',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const res = await manuallyMarkPaymentSucceededAction('pay-manual-1')
      expect(res).toEqual({ success: true })

      const rpcCall = mockDb.calls.find(
        (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
      )
      expect(rpcCall?.payload).toMatchObject({
        p_checkout_session_id: 'cs_manual_1',
        p_payment_intent_id: 'pi_manual_1',
        p_status: 'succeeded',
      })
    })

    test('updateUserRole and deleteUser prevent admin self-demotion and self-deletion', async () => {
      const adminUuid = '11111111-2222-4333-8444-555555555555'
      setMockSession({
        user: {
          id: adminUuid,
          email: 'admin@zap.ch',
          name: 'Admin',
          role: 'admin',
        },
        supabaseAccessToken: 'tok_admin',
      })

      const demoteRes = await updateUserRole(adminUuid, 'user')
      expect(demoteRes).toEqual({
        success: false,
        error: 'Du kannst deine eigene Admin-Rolle nicht entfernen.',
      })

      const selfDeleteRes = await deleteUser(adminUuid)
      expect(selfDeleteRes).toEqual({
        success: false,
        error: 'Du kannst dich nicht selbst löschen.',
      })
    })
  })

  test.describe('Family Sub-Account & Profile IDOR Protection (`family-actions.ts` & `profil/actions.ts`)', () => {
    test('blocks child accounts from creating further sub-accounts', async () => {
      setMockSession({
        user: {
          id: 'child-1',
          email: 'child@zap.local',
          name: 'Child',
          role: 'user',
          accountType: 'child',
          parentId: 'parent-1',
        },
        supabaseAccessToken: 'tok_child',
      })

      const res = await createChildAccountAction({
        firstName: 'Sub',
        lastName: 'Child',
        email: 'subchild@example.com',
      })
      expect(res).toEqual({
        success: false,
        error: 'Kinderkonten können keine weiteren Unterkonten erstellen.',
      })
    })

    test('prevents cross-parent IDOR on regenerateChildMagicLinkAction, deleteChildAccountAction, and getCoursesAndMaterialsAction', async () => {
      setMockSession({
        user: {
          id: 'parent-attacker-1',
          email: 'attacker@example.com',
          name: 'Attacker Parent',
          role: 'user',
          accountType: 'parent_solo',
        },
        supabaseAccessToken: 'tok_attacker',
      })

      const mockDb = createMockSupabase({
        tables: {
          user: (call) => {
            // When checking parent_id in getCoursesAndMaterialsAction (.eq('id', ...).eq('parent_id', ...))
            const hasParentIdFilter = call.filters?.some((f) => f.method === 'eq' && f.args[0] === 'parent_id')
            if (hasParentIdFilter) {
              return { data: null }
            }
            return {
              data: {
                id: 'child-of-victim-2',
                email: 'victim-child@example.com',
                parent_id: 'parent-victim-2',
              },
            }
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const magicLinkAttempt = await regenerateChildMagicLinkAction('child-of-victim-2')
      expect(magicLinkAttempt).toEqual({
        success: false,
        error: 'Keine Berechtigung für dieses Kinderkonto.',
      })

      const deleteAttempt = await deleteChildAccountAction('child-of-victim-2')
      expect(deleteAttempt).toEqual({
        success: false,
        error: 'Keine Berechtigung zum Löschen dieses Kontos.',
      })

      const coursesAttempt = await getCoursesAndMaterialsAction('child-of-victim-2')
      expect(coursesAttempt).toEqual({
        success: false,
        error: 'Keine Berechtigung zum Anzeigen dieser Kurse.',
      })
    })
  })

  test.describe('Mentorship, Material & Course Ownership Guards', () => {
    test('createRequest blocks users from requesting their own mentorship listing', async () => {
      setMockSession({
        user: { id: 'user-author-1', email: 'u1@example.com', name: 'Author', role: 'user' },
        supabaseAccessToken: 'tok_u1',
      })
      const mockDb = createMockSupabase({
        tables: {
          mentorship_listings: {
            select: { data: { author_id: 'user-author-1' } },
          },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb })

      const res = await createRequest('listing-1', 'Hallo!')
      expect(res).toEqual({
        success: false,
        error: 'Du kannst nicht dein eigenes Inserat anfragen.',
      })
    })

    test('updateMaterial prevents a teacher from editing another teacher’s material while allowing admins', async () => {
      setMockSession({
        user: { id: 'teacher-1', email: 't1@example.com', name: 'T1', role: 'lehrperson' },
        supabaseAccessToken: 'tok_t1',
      })
      const mockDb = createMockSupabase({
        tables: {
          learning_materials: {
            select: { data: { created_by: 'teacher-other-2' } },
          },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb })

      const formData = new FormData()
      formData.set('name', 'Mathe Blatt')
      formData.set('subject_id', '1')
      formData.set('is_link', 'true')
      formData.set('file_url', 'https://example.com/blatt.pdf')

      const res = await updateMaterial(99, formData)
      expect(res).toEqual({
        success: false,
        error: 'Nicht autorisiert - nur eigene Materialien bearbeiten',
      })
    })

    test('getKurse and getKurs filter by created_by for teachers (Principle of Least Privilege) but not for admins', async () => {
      const mockDb = createMockSupabase({
        tables: {
          intensivwoche_kurse_mit_anmeldungen: { select: { data: [] } },
          intensivwoche_kurse: { select: { data: { id: 10, name: 'Kurs 10' } } },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb })

      // 1. As teacher -> applies .eq('created_by', 'teacher-1')
      setMockSession({
        user: { id: 'teacher-1', email: 't1@example.com', name: 'T1', role: 'lehrperson' },
        supabaseAccessToken: 'tok_t1',
      })
      await getKurse()
      await getKurs(10)

      const teacherCalls = mockDb.calls.filter((c) => c.kind === 'from')
      expect(
        teacherCalls[0].filters?.some(
          (f) => f.method === 'eq' && f.args[0] === 'created_by' && f.args[1] === 'teacher-1'
        )
      ).toBe(true)
      expect(
        teacherCalls[1].filters?.some(
          (f) => f.method === 'eq' && f.args[0] === 'created_by' && f.args[1] === 'teacher-1'
        )
      ).toBe(true)

      // 2. As admin -> does NOT restrict by created_by
      mockDb.calls.length = 0
      setMockSession({
        user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
        supabaseAccessToken: 'tok_admin',
      })
      await getKurse()
      await getKurs(10)

      const adminCalls = mockDb.calls.filter((c) => c.kind === 'from')
      expect(
        adminCalls[0].filters?.some((f) => f.method === 'eq' && f.args[0] === 'created_by')
      ).toBe(false)
      expect(
        adminCalls[1].filters?.some((f) => f.method === 'eq' && f.args[0] === 'created_by')
      ).toBe(false)
    })

    test('submitIntensivwocheAnmeldung handles RPC rejections (rate_limit_exceeded, voll, bereits_angemeldet) and schedules after() outbox dispatch on success', async () => {
      const validInput = {
        kurs_id: '10',
        child_firstname: 'Mia',
        child_lastname: 'Muster',
        child_class_level: '6. Klasse',
        child_gender: 'w' as const,
        parent_email: 'Parent@Example.com',
        parent_phone: '+41 79 123 45 67',
        notes: 'Mathe Fokus',
      }

      // 1. Rate-limit rejection
      const rateLimitDb = createMockSupabase({
        rpcs: {
          book_intensivwoche_kurs: { data: null, error: { message: 'rate_limit_exceeded' } },
        },
      })
      setMockSupabaseClients({ server: rateLimitDb })
      const rateRes = await submitIntensivwocheAnmeldung(validInput, 'idem-1')
      expect(rateRes.success).toBe(false)
      if (!rateRes.success) {
        expect(rateRes.error).toContain('Zu viele Anmeldeversuche')
      }

      // 2. Successful booking links beneficiaryUserId and schedules after() callback
      const okDb = createMockSupabase({
        rpcs: {
          book_intensivwoche_kurs: { data: 'anm-new-99', error: null },
        },
      })
      setMockSupabaseClients({ server: okDb, admin: okDb })
      const okRes = await submitIntensivwocheAnmeldung(validInput, 'idem-2', 'child-user-99')
      expect(okRes).toEqual({
        success: true,
        message: 'Vielen Dank für deine Anmeldung! Wir leiten dich zur sicheren Bezahlung weiter.',
        anmeldungId: 'anm-new-99',
      })
      expect(getAfterCallbacks()).toHaveLength(1)
    })

    test('getMailOutboxRows and processMailOutboxNow enforce admin-only role', async () => {
      setMockSession({
        user: { id: 'teacher-1', email: 't@example.com', name: 'Teacher', role: 'lehrperson' },
        supabaseAccessToken: 'tok_teacher',
      })

      expect(await getMailOutboxRows()).toEqual({
        success: false,
        error: 'Nur Administratorinnen und Administratoren sehen die Mail-Warteschlange.',
      })
      expect(await processMailOutboxNow()).toEqual({
        success: false,
        error: 'Nur Administratorinnen und Administratoren sehen die Mail-Warteschlange.',
      })
    })
  })
})
