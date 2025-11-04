/*
  # Add Handover Complete Status and Auto-Update Functionality

  1. Changes
    - Add 'handover_complete' to project status enum
    - Create function to check if all required stages are complete
    - Create trigger to automatically update project status when stages are completed
  
  2. New Status
    - `handover_complete`: All required stages are complete or marked as N/A
  
  3. Automation
    - When stage statuses are updated, check if all required stages are complete
    - If true, automatically update project status to 'handover_complete'
    - Only updates projects that are not already 'handover_complete'
  
  4. Logic
    - A stage is considered "done" if its status is 'complete' or 'na'
    - Only required stages (is_required = true) are checked
    - All required stages must be "done" for project to be marked complete
*/

-- Add 'handover_complete' to the status check constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['awarded'::text, 'await_pre_let'::text, 'in_progress'::text, 'active'::text, 'handover_complete'::text]));

-- Create function to check if all required stages are complete
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
  
  -- If all required stages are complete and status is not already 'handover_complete'
  IF v_total_required > 0 AND v_completed_required = v_total_required 
     AND v_current_status != 'handover_complete' THEN
    UPDATE projects
    SET status = 'handover_complete'
    WHERE id = v_project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stage_statuses table
DROP TRIGGER IF EXISTS trigger_update_project_completion ON stage_statuses;

CREATE TRIGGER trigger_update_project_completion
AFTER INSERT OR UPDATE OF status ON stage_statuses
FOR EACH ROW
EXECUTE FUNCTION check_and_update_project_completion();

-- Create a manual function to check all existing projects
CREATE OR REPLACE FUNCTION update_all_project_completions()
RETURNS void AS $$
DECLARE
  v_project record;
  v_total_required integer;
  v_completed_required integer;
BEGIN
  FOR v_project IN SELECT id, status FROM projects WHERE status != 'handover_complete' LOOP
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
      SET status = 'handover_complete'
      WHERE id = v_project.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to update existing projects
SELECT update_all_project_completions();
