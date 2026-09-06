export type UserRole = "user" | "lehrperson" | "admin"

export interface Session {
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    role: UserRole
  }
  supabaseAccessToken?: string
}

export interface User {
  id: string
  email?: string | null
  role?: UserRole
  supabaseAccessToken?: string
  supabaseRefreshToken?: string
}
