import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"
import type { UserRole } from "@/types/next-auth"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Use createClient directly for server-side auth
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })

        if (error || !data.user || !data.session) {
          console.error("Supabase auth error:", error?.message)
          return null
        }

        // Fetch user data from profiles table (NICHT von auth.users!)
        // Pattern: Supabase Auth nur für Login/Register, danach alles über profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, first_name, last_name, email")
          .eq("id", data.user.id)
          .single()

        const role: UserRole = (profile?.role as UserRole) || "user"
        const displayName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || data.user.email

        return {
          id: data.user.id,
          email: profile?.email || data.user.email,
          name: displayName,
          role,
          // Speichere Supabase Tokens für RLS
          supabaseAccessToken: data.session.access_token,
          supabaseRefreshToken: data.session.refresh_token,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role || "user"
        // Speichere Supabase Tokens im JWT
        token.supabaseAccessToken = user.supabaseAccessToken
        token.supabaseRefreshToken = user.supabaseRefreshToken
      }
      
      // Refresh role on session update (optional: for role changes without re-login)
      if (trigger === "update") {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        // Lade Profildaten (nicht auth.users!)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("id", token.id)
          .single()
        
        token.role = (profile?.role as UserRole) || "user"
        if (profile?.first_name && profile?.last_name) {
          token.name = `${profile.first_name} ${profile.last_name}`
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.role = token.role as UserRole
        // Übergebe Supabase Token an Session
        session.supabaseAccessToken = token.supabaseAccessToken as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}

import NextAuth from "next-auth"

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)
