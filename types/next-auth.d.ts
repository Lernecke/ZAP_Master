import "next-auth"
import "next-auth/jwt"

export type UserRole = "user" | "lehrperson" | "admin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: UserRole
    }
    // Supabase Access Token für authentifizierte DB-Anfragen
    supabaseAccessToken?: string
  }

  interface User {
    id: string
    email?: string | null
    role?: UserRole
    // Tokens vom Supabase Login
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}
