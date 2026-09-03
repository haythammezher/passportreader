-- Migration: Schedule daily passport expiry notification checks via pg_cron
-- Runs every day at 8:00 AM UTC

-- Enable pg_cron extension (pre-installed in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing job if it exists (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'passport-expiry-notifications'
  ) THEN
    PERFORM cron.unschedule('passport-expiry-notifications');
  END IF;
END $$;

-- Schedule the edge function to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'passport-expiry-notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/passport-expiry-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
