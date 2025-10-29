/*
  # Add Project Type Column

  1. Changes
    - Add project_type column to projects table
    - Set allowed values: 'passive_fire', 'intumescent', 'passive_intumescent'
    - Set default value to 'passive_fire'
    - Add check constraint to enforce valid values

  2. Notes
    - Existing projects will default to 'passive_fire'
*/

-- Add project_type column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'passive_fire';

-- Add check constraint for valid project types
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE projects
ADD CONSTRAINT projects_project_type_check
CHECK (project_type IN ('passive_fire', 'intumescent', 'passive_intumescent'));
