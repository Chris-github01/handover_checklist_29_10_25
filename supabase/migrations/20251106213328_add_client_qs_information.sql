/*
  # Add Client QS Information to Projects

  1. Changes
    - Add `client_qs_name` column to store the name of the client's quantity surveyor
    - Add `client_qs_number` column to store the client QS phone number
    - Add `client_qs_email` column to store the client QS email address
  
  2. Notes
    - All columns are nullable to allow gradual data entry
    - Uses text data type for flexibility
*/

DO $$ 
BEGIN
  -- Add client_qs_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'client_qs_name'
  ) THEN
    ALTER TABLE projects ADD COLUMN client_qs_name text;
  END IF;

  -- Add client_qs_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'client_qs_number'
  ) THEN
    ALTER TABLE projects ADD COLUMN client_qs_number text;
  END IF;

  -- Add client_qs_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'client_qs_email'
  ) THEN
    ALTER TABLE projects ADD COLUMN client_qs_email text;
  END IF;
END $$;
