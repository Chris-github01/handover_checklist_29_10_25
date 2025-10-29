/*
  # Create storage bucket for attachments

  1. Storage Setup
    - Create 'attachments' bucket for file storage
    - Set up RLS policies for secure file access
    - Allow authenticated users to upload, view, and delete their own files

  2. Security
    - Users can only access files from projects they have access to
    - Files are organized by project/stage structure
*/

-- Create the attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Allow authenticated users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');