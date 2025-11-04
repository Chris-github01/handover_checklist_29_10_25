/*
  # Add Site Manager and QS Columns to Projects

  1. Changes
    - Add `site_manager` column to projects table (nullable text)
    - Add `qs` column to projects table (nullable text)
  
  2. Description
    - Site Manager (SM): Name of the site manager assigned to the project
    - QS: Name of the Quantity Surveyor assigned to the project
    - Both fields are optional and will display "-" when not set
*/

-- Add site_manager column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'site_manager'
  ) THEN
    ALTER TABLE projects ADD COLUMN site_manager text;
  END IF;
END $$;

-- Add qs column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'qs'
  ) THEN
    ALTER TABLE projects ADD COLUMN qs text;
  END IF;
END $$;
