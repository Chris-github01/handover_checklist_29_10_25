/*
  # Add is_small_project Column to Projects Table

  1. Changes
    - Add `is_small_project` boolean column to projects table
    - Default value is false (regular projects)
    - Small projects will have this set to true
  
  2. Purpose
    - Allow differentiation between regular projects and small projects
    - Small projects should not display stages/steps, only the project tile
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_small_project'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_small_project boolean DEFAULT false NOT NULL;
  END IF;
END $$;