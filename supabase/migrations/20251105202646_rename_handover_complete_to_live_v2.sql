/*
  # Rename Status from handover_complete to live

  1. Changes
    - Update all existing projects with status 'handover_complete' to 'live'
    - Update the status check constraint to replace 'handover_complete' with 'live'
    - Update all functions and triggers that reference 'handover_complete'
  
  2. Migration Steps
    - Drop constraint first
    - Update existing data
    - Add new constraint
    - Update function logic
  
  3. Security
    - No RLS changes needed
    - Maintains existing access control
*/

-- Drop the old constraint first
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new constraint with both 'handover_complete' and 'live' temporarily
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['awarded'::text, 'await_pre_let'::text, 'in_progress'::text, 'active'::text, 'handover_complete'::text, 'live'::text]));

-- Update existing projects with status 'handover_complete' to 'live'
UPDATE projects 
SET status = 'live' 
WHERE status = 'handover_complete';

-- Drop and recreate constraint with only 'live'
ALTER TABLE projects 
DROP CONSTRAINT projects_status_check;

ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['awarded'::text, 'await_pre_let'::text, 'in_progress'::text, 'active'::text, 'live'::text]));

-- Update the function to check and update project completion
CREATE OR REPLACE FUNCTION check_and_update_project_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
  v_total_required integer;
  v_completed_required integer;
  v_current_status text;
BEGIN
  -- Get the project_id from the trigger
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Get current project status
  SELECT status INTO v_current_status
  FROM projects
  WHERE id = v_project_id;
  
  -- Count total required stages for this project
  SELECT COUNT(*) INTO v_total_required
  FROM stages
  WHERE project_id = v_project_id
    AND is_required = true;
  
  -- Count completed/na required stages for this project
  SELECT COUNT(*) INTO v_completed_required
  FROM stages s
  INNER JOIN stage_statuses ss ON s.id = ss.stage_id
  WHERE s.project_id = v_project_id
    AND s.is_required = true
    AND ss.status IN ('complete', 'na');
  
  -- If all required stages are complete and status is not already 'live'
  IF v_total_required > 0 AND v_completed_required = v_total_required 
     AND v_current_status != 'live' THEN
    UPDATE projects
    SET status = 'live'
    WHERE id = v_project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the manual function to check all existing projects
CREATE OR REPLACE FUNCTION update_all_project_completions()
RETURNS void AS $$
DECLARE
  v_project record;
  v_total_required integer;
  v_completed_required integer;
BEGIN
  FOR v_project IN SELECT id, status FROM projects WHERE status != 'live' LOOP
    -- Count total required stages
    SELECT COUNT(*) INTO v_total_required
    FROM stages
    WHERE project_id = v_project.id
      AND is_required = true;
    
    -- Count completed/na required stages
    SELECT COUNT(*) INTO v_completed_required
    FROM stages s
    INNER JOIN stage_statuses ss ON s.id = ss.stage_id
    WHERE s.project_id = v_project.id
      AND s.is_required = true
      AND ss.status IN ('complete', 'na');
    
    -- Update if all required stages are complete
    IF v_total_required > 0 AND v_completed_required = v_total_required THEN
      UPDATE projects
      SET status = 'live'
      WHERE id = v_project.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;