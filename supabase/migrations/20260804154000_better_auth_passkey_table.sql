-- Migration: 20260804154000_better_auth_passkey_table.sql
-- Create "passkey" table required by @better-auth/passkey plugin

CREATE TABLE IF NOT EXISTS "passkey" (
  id TEXT PRIMARY KEY,
  name TEXT,
  "publicKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "credentialID" TEXT NOT NULL,
  counter INTEGER NOT NULL,
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL,
  transports TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  aaguid TEXT
);

-- Enable Row Level Security (RLS) on passkey table
ALTER TABLE "passkey" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for "passkey"
CREATE POLICY better_auth_passkey_select_self ON "passkey"
  FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY better_auth_passkey_all_self ON "passkey"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text OR public.is_admin());
