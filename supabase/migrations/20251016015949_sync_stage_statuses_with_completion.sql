/*
  # Sync Stage Statuses with Actual Completion

  1. Problem
    - stage_statuses table is out of sync with actual item completion
    - Some stages show as "pending" when all required items are checked
    - This causes incorrect display in the project card completed steps list

  2. Solution
    - Update stage_statuses based on actual item_checks data
    - Set status to 'complete' when all required items are checked
    - Set status to 'in_progress' when some (but not all) required items are checked
    - Set status to 'pending' when no required items are checked

  3. Changes
    - Update existing stage_statuses records to match actual completion state
*/

-- Update stage statuses based on actual item completion
UPDATE stage_statuses ss
SET status = CASE
  -- Complete: All required items are checked
  WHEN (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    LEFT JOIN item_checks ic ON ic.item_id = si.id AND ic.project_id = ss.project_id
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
      AND ic.is_checked = true
  ) = (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
  ) AND (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
  ) > 0 THEN 'complete'
  
  -- In Progress: Some required items are checked
  WHEN (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    LEFT JOIN item_checks ic ON ic.item_id = si.id AND ic.project_id = ss.project_id
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
      AND ic.is_checked = true
  ) > 0 THEN 'in_progress'
  
  -- Pending: No required items are checked
  ELSE 'pending'
END,
completed_at = CASE
  WHEN (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    LEFT JOIN item_checks ic ON ic.item_id = si.id AND ic.project_id = ss.project_id
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
      AND ic.is_checked = true
  ) = (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
  ) AND (
    SELECT COUNT(DISTINCT si.id)
    FROM stage_items si
    WHERE si.stage_id = ss.stage_id
      AND si.is_required = true
  ) > 0 THEN COALESCE(ss.completed_at, now())
  ELSE NULL
END;
