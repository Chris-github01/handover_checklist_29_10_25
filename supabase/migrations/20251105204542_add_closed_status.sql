/*
  # Add Closed Status for Completed Projects

  1. Changes
    - Add 'closed' status to the projects status constraint
    - This status represents projects that have been closed/completed
  
  2. New Status
    - `closed`: Project has been closed and moved to Completed Projects
  
  3. Security
    - No RLS changes needed
    - Maintains existing access control
*/

-- Drop the old constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new constraint with 'closed' status
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['awarded'::text, 'await_pre_let'::text, 'in_progress'::text, 'active'::text, 'live'::text, 'closed'::text]));