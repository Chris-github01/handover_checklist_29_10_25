/*
  # Add Awarded Status

  1. Changes
    - Drop existing CHECK constraint on projects.status column
    - Add new CHECK constraint including 'awarded' status as the first option
    
  2. Status Options (in order)
    - awarded (new)
    - await_pre_let
    - in_progress
    - active
*/

-- Drop the old constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new constraint with 'awarded' as first option
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['awarded'::text, 'await_pre_let'::text, 'in_progress'::text, 'active'::text]));