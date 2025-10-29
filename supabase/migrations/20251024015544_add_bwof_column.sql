/*
  # Add BWOF Column to Projects

  1. Changes
    - Add bwof boolean column to projects table
    - Set default value to false
    - This flag indicates projects that should skip stages 1-3

  2. Notes
    - BWOF (Building Warrant of Fitness) projects have different stage requirements
    - When BWOF is true, only stages 4-9 should be displayed
    - Existing projects will default to false (non-BWOF)
*/

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS bwof boolean DEFAULT false;
