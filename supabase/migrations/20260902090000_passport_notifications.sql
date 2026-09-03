-- Migration: Passport Expiry Notification Log
-- Tracks which notifications have been sent to prevent duplicates

CREATE TABLE IF NOT EXISTS public.passport_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  email_address TEXT NOT NULL
);

ALTER TABLE public.passport_notification_log
  ADD CONSTRAINT fk_notification_log_passport
  FOREIGN KEY (passport_id) REFERENCES public.passport_records(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_log_passport_id
  ON public.passport_notification_log(passport_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id
  ON public.passport_notification_log(user_id);

ALTER TABLE public.passport_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_notifications" ON public.passport_notification_log;
CREATE POLICY "users_view_own_notifications"
  ON public.passport_notification_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_insert_notifications" ON public.passport_notification_log;
CREATE POLICY "service_insert_notifications"
  ON public.passport_notification_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
