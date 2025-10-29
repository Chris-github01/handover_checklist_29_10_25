/*
  # Add Project Code Column

  1. Changes
    - Add `project_code` column to `projects` table
    - Column is optional (nullable) to support existing projects
    - Text type for flexibility in code formats

  2. Notes
    - Existing projects will have NULL project_code
    - New projects can include a project code
*/

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_code text;
