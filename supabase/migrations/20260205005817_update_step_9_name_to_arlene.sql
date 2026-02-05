/*
  # Update Step 9: Health & Safety name from Jacilise to Arlene

  1. Changes
    - Updates the title of Step 9 in the stages table
    - Changes "Step 9: Health & Safety (Jacilise)" to "Step 9: Health & Safety (Arlene)"
  
  2. Affected Records
    - All existing stages with code 'STEP_9' across all projects
  
  3. Notes
    - This is a simple text replacement update
    - No data structure changes
    - Safe to run on existing data
*/

UPDATE stages
SET title = 'Step 9: Health & Safety (Arlene)'
WHERE code = 'STEP_9' 
  AND title LIKE '%Jacilise%';
