export type UserRole = "user" | "lehrperson" | "admin"
export type AccountType = "parent_solo" | "child"

export interface Session {
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    role: UserRole
    accountType?: AccountType
    parentId?: string | null
  }
  supabaseAccessToken?: string
}

export interface User {
  id: string
  email?: string | null
  role?: UserRole
  accountType?: AccountType
  parentId?: string | null
  supabaseAccessToken?: string
  supabaseRefreshToken?: string
}
