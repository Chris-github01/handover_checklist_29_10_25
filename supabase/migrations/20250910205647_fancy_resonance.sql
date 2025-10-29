/*
  # Add file_path column to attachments table

  1. Changes
    - Add `file_path` column to store the storage path for file management
    - This allows us to properly delete files from storage when attachments are removed

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add file_path column to attachments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attachments' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE attachments ADD COLUMN file_path text;
  END IF;
END $$;