import { z } from "zod"

export const createChildAccountSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich"),
  classLevel: z.string().optional(),
  schoolName: z.string().optional(),
})

export type CreateChildAccountInput = z.infer<typeof createChildAccountSchema>

export interface ChildAccount {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  class_level: string | null
  school_name: string | null
  created_at: string | null
  magicLinkUrl?: string
}
