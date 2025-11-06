/*
  # Add Email Notification and Step 10 for Closed Projects

  1. Purpose
    - Send email to arlene@optimalfire.co.nz when project status changes to 'closed'
    - Automatically create Step 10 (PS3 and Warranty) stage when project is closed
    - Notify about PS3 and Warranty documents that need to be sent to client

  2. Changes
    - Create function to handle project status changes to 'closed'
    - Send notification to Arlene about PS3 and Warranty documents
    - Create Step 10 stage automatically if it doesn't exist
    - Create trigger on projects table to monitor status changes

  3. Email Details
    - Recipient: arlene@optimalfire.co.nz
    - Subject: Project Closed - [Project Name]
    - Message: Project has been closed. Please send PS3 and Warranty documents to client.

  4. Notes
    - Only triggers when status changes TO 'closed'
    - Creates Step 10 stage if it doesn't already exist
    - Initializes Step 10 with 'pending' status
*/

-- Create function to handle closed project actions
CREATE OR REPLACE FUNCTION handle_project_closed()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_exists boolean;
  v_new_stage_id uuid;
BEGIN
  -- Only act when status changes to 'closed'
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    
    -- Check if Step 10 already exists for this project
    SELECT EXISTS(
      SELECT 1 FROM stages 
      WHERE project_id = NEW.id 
      AND code = 'STEP_10'
    ) INTO v_stage_exists;
    
    -- Create Step 10 if it doesn't exist
    IF NOT v_stage_exists THEN
      -- Insert Step 10 stage
      INSERT INTO stages (
        project_id,
        code,
        title,
        owner_role,
        order_index,
        is_required
      ) VALUES (
        NEW.id,
        'STEP_10',
        'Step 10: PS3 and Warranty',
        'Director',
        10,
        true
      )
      RETURNING id INTO v_new_stage_id;

      -- Create the stage item
      INSERT INTO stage_items (
        stage_id,
        title,
        is_required,
        order_index
      ) VALUES (
        v_new_stage_id,
        'PS3 and Warranty Documents Issued',
        true,
        1
      );

      -- Initialize stage status
      INSERT INTO stage_statuses (
        stage_id,
        project_id,
        status
      ) VALUES (
        v_new_stage_id,
        NEW.id,
        'pending'
      );
    END IF;
    
    -- Insert notification record for email
    INSERT INTO notifications (
      project_id,
      event,
      subject,
      body,
      created_at
    ) VALUES (
      NEW.id,
      'stage_completed',
      'Project Closed - ' || NEW.name,
      'Project "' || NEW.name || '" has been moved to Completed Projects. Please send PS3 and Warranty documents to the client.',
      now()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_handle_project_closed ON projects;

-- Create trigger on projects table
CREATE TRIGGER trigger_handle_project_closed
AFTER UPDATE OF status ON projects
FOR EACH ROW
EXECUTE FUNCTION handle_project_closed();
