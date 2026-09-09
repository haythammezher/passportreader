-- Create storage bucket for passport photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-photos',
  'passport-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Add photo_url column to passport_records
ALTER TABLE public.passport_records
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Storage RLS policies
DROP POLICY IF EXISTS "Users can upload own passport photos" ON storage.objects;
CREATE POLICY "Users can upload own passport photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'passport-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own passport photos" ON storage.objects;
CREATE POLICY "Users can view own passport photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'passport-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own passport photos" ON storage.objects;
CREATE POLICY "Users can update own passport photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'passport-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own passport photos" ON storage.objects;
CREATE POLICY "Users can delete own passport photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'passport-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
