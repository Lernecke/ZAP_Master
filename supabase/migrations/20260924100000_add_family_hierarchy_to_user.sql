-- Migration: 20260924100000_add_family_hierarchy_to_user.sql
-- Add Family Account Hierarchy (account_type & parent_id) to public."user"

-- 1. Add columns for parent-child relationship
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'parent_solo',
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public."user"(id) ON DELETE SET NULL;

-- 2. Add check constraints for account_type and prevent self-parenting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_account_type_check'
  ) THEN
    ALTER TABLE public."user" ADD CONSTRAINT user_account_type_check
      CHECK (account_type IS NULL OR account_type IN ('parent_solo', 'child'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_prevent_self_parent'
  ) THEN
    ALTER TABLE public."user" ADD CONSTRAINT user_prevent_self_parent
      CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;
END $$;

-- 3. Performance index for querying children by parent_id
CREATE INDEX IF NOT EXISTS idx_user_parent_id ON public."user"(parent_id);

-- 4. Update Row Level Security (RLS) policies on public."user"
-- Select policy: User can view their own profile, parent can view children profiles, admin can view all
DROP POLICY IF EXISTS better_auth_user_select_self ON public."user";
DROP POLICY IF EXISTS better_auth_user_select_family ON public."user";

CREATE POLICY better_auth_user_select_family ON public."user"
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()::text 
    OR parent_id = auth.uid()::text 
    OR public.is_admin()
  );

-- Update policy: User can update their own profile, parent can update child profiles, admin can update all
DROP POLICY IF EXISTS better_auth_user_update_self ON public."user";
DROP POLICY IF EXISTS better_auth_user_update_family ON public."user";

CREATE POLICY better_auth_user_update_family ON public."user"
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()::text 
    OR parent_id = auth.uid()::text 
    OR public.is_admin()
  );
