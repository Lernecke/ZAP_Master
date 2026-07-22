import { z } from 'zod'

export const contactFormSchema = z.object({
  preferredContact: z.enum(['phone', 'email'], {
    message: 'Bitte wähle eine bevorzugte Kontaktart aus',
  }),
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen haben'),
  email: z.string().min(1, 'E-Mail-Adresse ist erforderlich').email('Ungültige E-Mail-Adresse'),
  phone: z.string().max(30, 'Telefonnummer darf maximal 30 Zeichen haben').optional(),
  message: z
    .string()
    .min(1, 'Bitte gib eine Frage oder einen Kommentar ein')
    .max(2000, 'Nachricht darf maximal 2000 Zeichen haben'),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
