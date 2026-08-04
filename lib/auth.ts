import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { sendVerificationEmailMailpit } from "@/lib/mail/mailpit-client"

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
  } as any,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendVerificationEmailMailpit({ email: user.email, url })
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
    },
  },
})
