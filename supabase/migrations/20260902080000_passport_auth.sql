-- Auth integration for passport_records
-- Adds user_id column and updates RLS policies for user ownership

-- 1. Add user_id column to passport_records
ALTER TABLE public.passport_records
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index on user_id
CREATE INDEX IF NOT EXISTS idx_passport_records_user_id ON public.passport_records(user_id);

-- 3. Create handle_new_user trigger function for profiles table
CREATE OR REPLACE FUNCTION public.handle_new_passport_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_passport ON auth.users;
CREATE TRIGGER on_auth_user_created_passport
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_passport_user();

-- 5. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for profiles
DROP POLICY IF EXISTS "users_manage_own_profiles" ON public.profiles;
CREATE POLICY "users_manage_own_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 7. Update passport_records RLS: drop old public policy, add user-owned policy
DROP POLICY IF EXISTS "public_full_access_passport_records" ON public.passport_records;

DROP POLICY IF EXISTS "users_manage_own_passport_records" ON public.passport_records;
CREATE POLICY "users_manage_own_passport_records"
ON public.passport_records
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8. Mock demo users
DO $$
DECLARE
  demo_uuid UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    demo_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo@passportreader.com', crypt('demo1234', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Demo Officer', 'avatar_url', ''),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Demo user creation skipped: %', SQLERRM;
END $$;
