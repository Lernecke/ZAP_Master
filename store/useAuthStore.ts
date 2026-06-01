import { create } from 'zustand'
import type { Session } from 'next-auth'
import type { UserRole } from '@/types/next-auth'

interface AuthState {
  userId: string | null
  name: string | null
  email: string | null
  role: UserRole | null
  supabaseAccessToken: string | null

  // Computed from role
  isAdmin: boolean
  isContentManager: boolean
  isStudent: boolean
  isAuthenticated: boolean

  // Mirrors NextAuth status; stays 'loading' until first setSession call
  status: 'loading' | 'authenticated' | 'unauthenticated'

  setSession: (session: Session | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  name: null,
  email: null,
  role: null,
  supabaseAccessToken: null,
  isAdmin: false,
  isContentManager: false,
  isStudent: false,
  isAuthenticated: false,
  status: 'loading',

  setSession: (session) => {
    if (!session?.user) {
      set({
        userId: null,
        name: null,
        email: null,
        role: null,
        supabaseAccessToken: null,
        isAdmin: false,
        isContentManager: false,
        isStudent: false,
        isAuthenticated: false,
        status: 'unauthenticated',
      })
      return
    }

    const role = session.user.role ?? null
    set({
      userId: session.user.id ?? null,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      role,
      supabaseAccessToken: session.supabaseAccessToken ?? null,
      isAdmin: role === 'admin',
      isContentManager: role === 'lehrperson' || role === 'admin',
      isStudent: role === 'user',
      isAuthenticated: true,
      status: 'authenticated',
    })
  },

  clear: () =>
    set({
      userId: null,
      name: null,
      email: null,
      role: null,
      supabaseAccessToken: null,
      isAdmin: false,
      isContentManager: false,
      isStudent: false,
      isAuthenticated: false,
      status: 'unauthenticated',
    }),
}))
