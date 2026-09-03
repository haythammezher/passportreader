-- ============================================================
-- RBAC: user_roles table for passport records access control
-- Roles: admin (full access), editor (read+write), viewer (read-only)
-- ============================================================

-- 1. Create role enum
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer'::public.app_role,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 3. Helper functions (BEFORE RLS policies)

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = uid LIMIT 1;
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;

-- Check if current user can edit (admin or editor)
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin'::public.app_role, 'editor'::public.app_role)
  );
$$;

-- Check if current user has any role (any authenticated team member)
CREATE OR REPLACE FUNCTION public.has_any_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  );
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_roles table

-- Users can view their own role
DROP POLICY IF EXISTS "users_view_own_role" ON public.user_roles;
CREATE POLICY "users_view_own_role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles
DROP POLICY IF EXISTS "admins_view_all_roles" ON public.user_roles;
CREATE POLICY "admins_view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can insert roles
DROP POLICY IF EXISTS "admins_insert_roles" ON public.user_roles;
CREATE POLICY "admins_insert_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admins can update roles
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
CREATE POLICY "admins_update_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins can delete roles
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;
CREATE POLICY "admins_delete_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 6. Update passport_records RLS to respect roles
-- Viewers and editors and admins can SELECT passport records
DROP POLICY IF EXISTS "roles_select_passport_records" ON public.passport_records;
CREATE POLICY "roles_select_passport_records"
ON public.passport_records
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_any_role()
);

-- Only editors and admins can INSERT passport records
DROP POLICY IF EXISTS "roles_insert_passport_records" ON public.passport_records;
CREATE POLICY "roles_insert_passport_records"
ON public.passport_records
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.can_edit()
);

-- Only editors and admins can UPDATE passport records
DROP POLICY IF EXISTS "roles_update_passport_records" ON public.passport_records;
CREATE POLICY "roles_update_passport_records"
ON public.passport_records
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_edit()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.can_edit()
);

-- Only admins can DELETE passport records
DROP POLICY IF EXISTS "roles_delete_passport_records" ON public.passport_records;
CREATE POLICY "roles_delete_passport_records"
ON public.passport_records
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

-- 7. Trigger for updated_at
DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_roles_updated_at();

-- 8. Assign the first existing user as admin (safe bootstrap)
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Bootstrap admin assignment skipped: %', SQLERRM;
END $$;
