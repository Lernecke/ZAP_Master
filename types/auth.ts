import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Bitte gib eine gültige E-Mail-Adresse ein'),
  password: z
    .string()
    .min(6, 'Passwort muss mindestens 6 Zeichen haben'),
})

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'E-Mail ist erforderlich')
      .email('Bitte gib eine gültige E-Mail-Adresse ein'),
    password: z
      .string()
      .min(6, 'Passwort muss mindestens 6 Zeichen haben'),
    confirmPassword: z
      .string()
      .min(1, 'Bitte Passwort bestätigen'),
    firstName: z
      .string()
      .min(1, 'Vorname ist erforderlich')
      .max(50, 'Vorname darf maximal 50 Zeichen haben'),
    lastName: z
      .string()
      .min(1, 'Nachname ist erforderlich')
      .max(50, 'Nachname darf maximal 50 Zeichen haben'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
