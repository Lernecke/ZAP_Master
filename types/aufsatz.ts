import { z } from 'zod'

// Matches ALLOWED_MIME_TYPES in app/(dashboard)/aufsaetze/actions.ts
// Note: 'application/msword' (.doc legacy) is intentionally excluded —
// the task spec targets only modern formats (.pdf and .docx).
export const ALLOWED_ESSAY_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const createSignedUploadUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, 'Dateiname ist erforderlich')
    .max(100, 'Dateiname darf maximal 100 Zeichen haben'),
  fileType: z.enum(ALLOWED_ESSAY_MIME_TYPES, {
    message: 'Nur PDF und Word-Dokumente (.docx) sind erlaubt',
  }),
  // max = 10 MB in bytes (10 * 1024 * 1024)
  fileSize: z
    .number({ message: 'Dateigrösse muss eine Zahl sein' })
    .int('Dateigrösse muss eine ganze Zahl sein')
    .min(1, 'Datei darf nicht leer sein')
    .max(10_485_760, 'Datei darf maximal 10 MB gross sein'),
})

export const gradeEssaySchema = z
  .object({
    // Swiss school grades: 1 (ungenügend) to 6 (sehr gut), half-points allowed
    grade: z
      .number()
      .min(1, 'Note muss mindestens 1 sein')
      .max(6, 'Note darf maximal 6 sein')
      .optional(),
    feedback: z
      .string()
      .max(5000, 'Feedback darf maximal 5000 Zeichen haben')
      .optional(),
  })
  .refine(
    (data) =>
      data.grade !== undefined ||
      (data.feedback !== undefined && data.feedback.trim().length > 0),
    {
      message: 'Bitte Note oder Feedback angeben',
      path: ['grade'],
    }
  )

export const createStructuredRubricSchema = z.object({
  title: z
    .string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel darf maximal 200 Zeichen haben'),
  criteria: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, 'Kriteriumsname ist erforderlich')
          .max(100, 'Kriteriumsname darf maximal 100 Zeichen haben'),
        description: z
          .string()
          .min(1, 'Beschreibung ist erforderlich')
          .max(500, 'Beschreibung darf maximal 500 Zeichen haben'),
      })
    )
    .min(1, 'Mindestens ein Kriterium ist erforderlich'),
})

export type CreateSignedUploadUrlInput = z.infer<typeof createSignedUploadUrlSchema>
export type GradeEssayInput = z.infer<typeof gradeEssaySchema>
export type CreateStructuredRubricInput = z.infer<typeof createStructuredRubricSchema>
