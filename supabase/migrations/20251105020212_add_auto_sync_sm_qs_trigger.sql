/*
  # Auto-sync Site Manager and QS from item checks to projects

  1. Function
    - Creates a trigger function that automatically updates project SM and QS
    - Runs whenever item_checks are inserted, updated, or deleted
    - Extracts names from "Selected: [name]" format in notes

  2. Trigger
    - Fires after INSERT, UPDATE, or DELETE on item_checks
    - Updates the parent project's site_manager and qs fields
    - Handles both setting and clearing values

  3. Logic
    - Site Manager: from STEP_5 "Assign Manager" item
    - QS: from STEP_1 "Assign QS" item
    - If check is deleted, clears the corresponding field
    - If check is added/updated with "Selected:" note, sets the field
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_sm_qs_on_item_check ON item_checks;
DROP FUNCTION IF EXISTS sync_sm_qs_from_item_checks();

-- Create the trigger function
CREATE OR REPLACE FUNCTION sync_sm_qs_from_item_checks()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
  v_stage_code text;
  v_item_title text;
  v_selected_value text;
BEGIN
  -- Determine project_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Get stage code and item title
  IF TG_OP = 'DELETE' THEN
    SELECT s.code, si.title INTO v_stage_code, v_item_title
    FROM stage_items si
    JOIN stages s ON s.id = si.stage_id
    WHERE si.id = OLD.item_id;
  ELSE
    SELECT s.code, si.title INTO v_stage_code, v_item_title
    FROM stage_items si
    JOIN stages s ON s.id = si.stage_id
    WHERE si.id = NEW.item_id;
  END IF;

  -- Handle QS assignment (STEP_1 "Assign QS")
  IF v_stage_code = 'STEP_1' AND v_item_title = 'Assign QS' THEN
    IF TG_OP = 'DELETE' OR (NEW.note IS NULL OR NEW.note NOT LIKE 'Selected:%') THEN
      -- Clear QS if check is deleted or note doesn't have selection
      UPDATE projects
      SET qs = NULL
      WHERE id = v_project_id;
    ELSE
      -- Set QS from note
      v_selected_value := INITCAP(TRIM(REPLACE(NEW.note, 'Selected:', '')));
      UPDATE projects
      SET qs = v_selected_value
      WHERE id = v_project_id;
    END IF;
  END IF;

  -- Handle Site Manager assignment (STEP_5 "Assign Manager")
  IF v_stage_code = 'STEP_5' AND v_item_title = 'Assign Manager' THEN
    IF TG_OP = 'DELETE' OR (NEW.note IS NULL OR NEW.note NOT LIKE 'Selected:%') THEN
      -- Clear Site Manager if check is deleted or note doesn't have selection
      UPDATE projects
      SET site_manager = NULL
      WHERE id = v_project_id;
    ELSE
      -- Set Site Manager from note
      v_selected_value := INITCAP(TRIM(REPLACE(NEW.note, 'Selected:', '')));
      UPDATE projects
      SET site_manager = v_selected_value
      WHERE id = v_project_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER sync_sm_qs_on_item_check
AFTER INSERT OR UPDATE OR DELETE ON item_checks
FOR EACH ROW
EXECUTE FUNCTION sync_sm_qs_from_item_checks();
