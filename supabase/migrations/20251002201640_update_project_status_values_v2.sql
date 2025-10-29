/*
  # Update Project Status Values

  1. Changes
    - Drop existing CHECK constraint on projects.status column
    - Update existing projects to map old statuses to new ones
    - Add new CHECK constraint with updated status values: 'await_pre_let', 'pending', 'active'
    
  2. Status Mapping
    - 'on_hold' -> 'pending'
    - 'completed' -> 'active' (since there's no completed status anymore)
    - 'active' remains 'active'
    
  3. Notes
    - This migration safely updates the constraint to support the new status values
    - Existing data is preserved and mapped to appropriate new statuses
*/

-- Drop the old constraint first
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Update existing project statuses to new values
UPDATE projects 
SET status = 'pending' 
WHERE status = 'on_hold';

UPDATE projects 
SET status = 'active' 
WHERE status = 'completed';

-- Add new constraint with updated status values
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['await_pre_let'::text, 'pending'::text, 'active'::text]));

-- Update default value for new projects
ALTER TABLE projects 
ALTER COLUMN status SET DEFAULT 'await_pre_let';