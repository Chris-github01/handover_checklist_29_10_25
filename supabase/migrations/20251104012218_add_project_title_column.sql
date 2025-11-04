/*
  # Add project_title column to projects table

  1. Changes
    - Add `project_title` column to `projects` table
    - Column stores the auto-generated folder name based on naming convention
    - Column is nullable to support existing projects
    - Default value is empty string for new projects
  
  2. Notes
    - Project title follows format: <ProjectShort> - <ClientShort>_<ProjectCode>
    - Examples: "AIAL DP - Hawkins_505A", "City Gallery SU - NL_212W"
    - Existing projects will have null project_title until edited
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_title'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN project_title text;
  END IF;
END $$;