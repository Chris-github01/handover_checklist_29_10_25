/*
  # Sync Site Manager and QS from item_checks to projects

  1. Updates
    - Updates existing projects table with site_manager and qs values from item_checks
    - Extracts names from item_checks.note field (format: "Selected: [name]")
  
  2. Notes
    - Site Manager comes from STEP_5 "Assign Manager" item
    - QS comes from STEP_1 "Assign QS" item
    - Names are capitalized properly for display
*/

-- Update projects with QS from STEP_1 "Assign QS"
UPDATE projects p
SET qs = INITCAP(TRIM(REPLACE(ic.note, 'Selected:', '')))
FROM item_checks ic
JOIN stage_items si ON si.id = ic.item_id
JOIN stages s ON s.id = si.stage_id
WHERE s.project_id = p.id
  AND s.code = 'STEP_1'
  AND si.title = 'Assign QS'
  AND ic.note IS NOT NULL
  AND ic.note LIKE 'Selected:%';

-- Update projects with Site Manager from STEP_5 "Assign Manager"
UPDATE projects p
SET site_manager = INITCAP(TRIM(REPLACE(ic.note, 'Selected:', '')))
FROM item_checks ic
JOIN stage_items si ON si.id = ic.item_id
JOIN stages s ON s.id = si.stage_id
WHERE s.project_id = p.id
  AND s.code = 'STEP_5'
  AND si.title = 'Assign Manager'
  AND ic.note IS NOT NULL
  AND ic.note LIKE 'Selected:%';
