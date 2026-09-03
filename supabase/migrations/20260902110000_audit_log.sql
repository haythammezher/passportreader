-- Audit Log Table Migration
-- Tracks all actions performed on passport records

CREATE TABLE IF NOT EXISTS public.audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'passport_record',
  entity_id TEXT,
  entity_label TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON public.audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_full_access_audit_log" ON public.audit_log;
CREATE POLICY "public_full_access_audit_log"
ON public.audit_log
FOR ALL
TO public
USING (true)
WITH CHECK (true);
