import { z } from 'zod'

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'Vorname ist erforderlich')
    .max(50, 'Vorname darf maximal 50 Zeichen haben'),
  last_name: z
    .string()
    .min(1, 'Nachname ist erforderlich')
    .max(50, 'Nachname darf maximal 50 Zeichen haben'),
  phone: z
    .string()
    .max(20, 'Telefonnummer darf maximal 20 Zeichen haben')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio darf maximal 500 Zeichen haben')
    .optional(),
  school_name: z
    .string()
    .max(100, 'Schulname darf maximal 100 Zeichen haben')
    .optional(),
})

export const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    message: "Theme muss 'light', 'dark' oder 'system' sein",
  }),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>
