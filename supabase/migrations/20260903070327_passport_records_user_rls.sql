-- Gate passport_records to authenticated owner only
-- Replaces the public full-access policy with per-user RLS enforcement

-- 1. Drop the existing permissive public policy
DROP POLICY IF EXISTS "public_full_access_passport_records" ON public.passport_records;

-- 2. Add index on user_id for efficient per-user queries
CREATE INDEX IF NOT EXISTS idx_passport_records_user_id ON public.passport_records(user_id);

-- 3. RLS is already enabled — create user-scoped policies

-- SELECT: users can only read their own records
DROP POLICY IF EXISTS "users_select_own_passport_records" ON public.passport_records;
CREATE POLICY "users_select_own_passport_records"
ON public.passport_records
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: users can only insert records owned by themselves
DROP POLICY IF EXISTS "users_insert_own_passport_records" ON public.passport_records;
CREATE POLICY "users_insert_own_passport_records"
ON public.passport_records
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own records
DROP POLICY IF EXISTS "users_update_own_passport_records" ON public.passport_records;
CREATE POLICY "users_update_own_passport_records"
ON public.passport_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: users can only delete their own records
DROP POLICY IF EXISTS "users_delete_own_passport_records" ON public.passport_records;
CREATE POLICY "users_delete_own_passport_records"
ON public.passport_records
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
