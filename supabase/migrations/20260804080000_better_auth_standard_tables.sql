-- Better Auth standard tables (user, session, account, verification)
-- Migration: 20260804080000_better_auth_standard_tables.sql

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all Better Auth tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for "user"
CREATE POLICY better_auth_user_select_self ON "user"
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR public.is_admin());

-- RLS Policies for "session"
CREATE POLICY better_auth_session_select_self ON "session"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- RLS Policies for "account"
CREATE POLICY better_auth_account_select_self ON "account"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- Trigger to sync better-auth user table to profiles table
CREATE OR REPLACE FUNCTION sync_better_auth_user_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  first_n TEXT;
  last_n TEXT;
  user_uuid UUID;
BEGIN
  first_n := split_part(NEW.name, ' ', 1);
  last_n := substring(NEW.name from position(' ' in NEW.name) + 1);
  IF last_n IS NULL OR last_n = '' THEN
    last_n := '';
  END IF;

  BEGIN
    user_uuid := NEW.id::uuid;
  EXCEPTION WHEN OTHERS THEN
    user_uuid := gen_random_uuid();
  END;

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    user_uuid,
    NEW.email,
    first_n,
    last_n,
    COALESCE(NEW.role, 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_better_auth_user_to_profile ON "user";
CREATE TRIGGER trg_sync_better_auth_user_to_profile
  AFTER INSERT OR UPDATE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION sync_better_auth_user_to_profile();
