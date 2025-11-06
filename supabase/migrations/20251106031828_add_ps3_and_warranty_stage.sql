/*
  # Add PS3 and Warranty Stage (Step 10)

  1. Purpose
    - Adds Step 10 (PS3 and Warranty) stage to all projects with status 'completed'
    - Creates stage with single required item for document issuance
    - Ensures proper ordering and status initialization

  2. Changes
    - Inserts new stage for each completed project
    - Creates stage item: "PS3 and Warranty Documents Issued"
    - Initializes stage_statuses for each new stage
    - Uses 'pending' status for new stages

  3. Notes
    - Only affects projects with status = 'completed'
    - New stage has order_index = 10
    - Stage owner role is 'Director'
    - All new stages start in 'pending' status
*/

-- Insert Step 10 stage for all completed projects
DO $$
DECLARE
  project_record RECORD;
  new_stage_id uuid;
BEGIN
  -- Loop through all completed projects
  FOR project_record IN 
    SELECT id FROM projects WHERE status = 'completed'
  LOOP
    -- Check if this project already has a Step 10 stage
    IF NOT EXISTS (
      SELECT 1 FROM stages 
      WHERE project_id = project_record.id 
      AND code = 'STEP_10'
    ) THEN
      -- Create Step 10 stage for this project
      INSERT INTO stages (
        project_id,
        code,
        title,
        owner_role,
        order_index,
        is_required
      ) VALUES (
        project_record.id,
        'STEP_10',
        'Step 10: PS3 and Warranty',
        'Director',
        10,
        true
      )
      RETURNING id INTO new_stage_id;

      -- Create the single required item for this stage
      INSERT INTO stage_items (
        stage_id,
        title,
        is_required,
        order_index
      ) VALUES (
        new_stage_id,
        'PS3 and Warranty Documents Issued',
        true,
        1
      );

      -- Initialize stage status as pending
      INSERT INTO stage_statuses (
        stage_id,
        project_id,
        status
      ) VALUES (
        new_stage_id,
        project_record.id,
        'pending'
      );
    END IF;
  END LOOP;
END $$;
