/*
  # Add region column to projects table

  1. Changes
    - Add `region` column to `projects` table with options 'auckland' or 'wellington'
    - Set default value to 'auckland'
    - Column is NOT NULL to ensure all projects have a region
  
  2. Notes
    - Existing projects will be set to 'auckland' by default
    - Region is used to categorize projects by geographical location
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'region'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN region text NOT NULL DEFAULT 'auckland' 
    CHECK (region IN ('auckland', 'wellington'));
  END IF;
END $$;