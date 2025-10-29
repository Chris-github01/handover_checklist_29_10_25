/*
  # Rename Pending Status to In Progress

  1. Changes
    - Update existing projects from 'pending' to 'in_progress'
    - Drop existing CHECK constraint on projects.status column
    - Add new CHECK constraint with 'in_progress' instead of 'pending'
    
  2. Notes
    - This changes the status value from 'pending' to 'in_progress'
    - The UI will display this as "In Progress"
*/

-- Drop the old constraint first
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Update existing project statuses from pending to in_progress
UPDATE projects 
SET status = 'in_progress' 
WHERE status = 'pending';

-- Add new constraint with updated status values
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['await_pre_let'::text, 'in_progress'::text, 'active'::text]));