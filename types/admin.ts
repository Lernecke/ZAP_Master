import { z } from 'zod'

export const updateUserRoleSchema = z.object({
  userId: z
    .string()
    .uuid('Ungültige Benutzer-ID'),
  newRole: z.enum(['user', 'lehrperson', 'admin'], {
    message: "Rolle muss 'user', 'lehrperson' oder 'admin' sein",
  }),
})

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
