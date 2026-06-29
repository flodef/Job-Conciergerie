-- Migration script to create Supabase Storage bucket for house images
-- Run this in the Supabase SQL Editor or via CLI

-- Note: Storage buckets cannot be created via SQL directly in Supabase.
-- You must create them through the Supabase Dashboard or CLI.
-- This script provides the SQL for RLS policies that should be applied AFTER creating the bucket.

-- ============================================
-- STEP 1: Create the bucket (via Dashboard or CLI)
-- ============================================
-- Option A: Via Supabase Dashboard
-- 1. Go to Storage in your Supabase project
-- 2. Click "Create a new bucket"
-- 3. Name it exactly: "House images"
-- 4. Make it public (uncheck "Private bucket")
-- 5. Click "Create bucket"

-- Option B: Via Supabase CLI
-- supabase storage buckets create "House images" --public

-- ============================================
-- STEP 2: Apply RLS policies (run this SQL after creating the bucket)
-- ============================================

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all objects in the "House images" bucket
CREATE POLICY "Allow public read access to House images"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'House images'));

-- Policy: Allow authenticated users to upload to the "House images" bucket
CREATE POLICY "Allow authenticated upload to House images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'House images'));

-- Policy: Allow authenticated users to update objects in the "House images" bucket
CREATE POLICY "Allow authenticated update to House images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'House images'))
WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'House images'));

-- Policy: Allow authenticated users to delete objects in the "House images" bucket
CREATE POLICY "Allow authenticated delete from House images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'House images'));

-- ============================================
-- STEP 3: Verify the bucket was created
-- ============================================
-- Run this to check if the bucket exists:
SELECT * FROM storage.buckets WHERE name = 'House images';

-- ============================================
-- STEP 4: Create the Reports folder (optional, will be auto-created on first upload)
-- ============================================
-- The Reports folder will be automatically created when the first report image is uploaded
-- No manual action needed
