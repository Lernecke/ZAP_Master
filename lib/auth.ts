import { betterAuth } from "better-auth"
import { magicLink } from "better-auth/plugins"
import { Pool } from "pg"
import {
  sendVerificationEmailMailpit,
  sendMagicLinkEmailMailpit,
  sendResetPasswordEmailMailpit,
} from "@/lib/mail/mailpit-client"

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

const pool = new Pool({
  connectionString: databaseUrl,
})

export const auth = betterAuth({
  database: pool,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "zap-v2-better-auth-secret-key-32chars-minimum",
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  advanced: {
    generateId: () => crypto.randomUUID(),
  } as unknown as Record<string, unknown>,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendResetPasswordEmailMailpit({ email: user.email, url })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendVerificationEmailMailpit({ email: user.email, url })
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmailMailpit({ email, url })
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
      firstName: {
        type: "string",
        required: false,
        fieldName: "first_name",
      },
      lastName: {
        type: "string",
        required: false,
        fieldName: "last_name",
      },
      phone: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
        fieldName: "avatar_url",
      },
      gender: {
        type: "string",
        required: false,
      },
      birthDate: {
        type: "string",
        required: false,
        fieldName: "birth_date",
      },
      schoolName: {
        type: "string",
        required: false,
        fieldName: "school_name",
      },
      classLevel: {
        type: "string",
        required: false,
        fieldName: "class_level",
      },
      bio: {
        type: "string",
        required: false,
      },
      themePreference: {
        type: "string",
        required: false,
        defaultValue: "light",
        fieldName: "theme_preference",
      },
    },
  },
})

