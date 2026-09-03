-- Passport Records Table Migration
-- Creates the passport_records table with public access (shared app, no auth required)

CREATE TABLE IF NOT EXISTS public.passport_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  holder_name TEXT NOT NULL,
  holder_name_ar TEXT,
  nationality TEXT NOT NULL,
  nationality_code TEXT NOT NULL,
  flag_emoji TEXT,
  passport_number TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'P',
  sex TEXT NOT NULL DEFAULT 'M',
  date_of_birth TEXT NOT NULL,
  place_of_birth TEXT,
  issue_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  issuing_authority TEXT,
  issuing_country TEXT NOT NULL,
  personal_number TEXT,
  mrz_line1 TEXT,
  mrz_line2 TEXT,
  mrz_valid BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_passport_records_passport_number ON public.passport_records(passport_number);
CREATE INDEX IF NOT EXISTS idx_passport_records_nationality_code ON public.passport_records(nationality_code);
CREATE INDEX IF NOT EXISTS idx_passport_records_expiry_date ON public.passport_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_passport_records_created_at ON public.passport_records(created_at DESC);

-- Enable RLS
ALTER TABLE public.passport_records ENABLE ROW LEVEL SECURITY;

-- Public access policy (shared app — all users can read/write)
DROP POLICY IF EXISTS "public_full_access_passport_records" ON public.passport_records;
CREATE POLICY "public_full_access_passport_records"
ON public.passport_records
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_passport_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_records_updated_at ON public.passport_records;
CREATE TRIGGER passport_records_updated_at
  BEFORE UPDATE ON public.passport_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_passport_records_updated_at();
