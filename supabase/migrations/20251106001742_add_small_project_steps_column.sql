/*
  # Add small project steps column

  1. Changes
    - Add `small_project_steps` column to `projects` table to store selected steps as array
    - Column is nullable and defaults to NULL for regular projects
    - For small projects, it stores an array of step numbers (e.g., [1, 2, 5, 8])

  2. Security
    - No RLS changes needed (inherits from existing table policies)
*/

-- Add small_project_steps column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'small_project_steps'
  ) THEN
    ALTER TABLE projects ADD COLUMN small_project_steps INTEGER[];
  END IF;
END $$;