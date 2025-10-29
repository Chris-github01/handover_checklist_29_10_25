/*
  # Fix Duplicate Stage Statuses

  1. Problem
    - Multiple duplicate entries exist in stage_statuses table for the same project_id and stage_id
    - This causes completed steps to appear multiple times in the UI

  2. Solution
    - Remove duplicate stage_statuses entries, keeping only the most recently created one
    - Add unique constraint to prevent future duplicates
    - Update the stage_statuses table to ensure one status per project-stage combination

  3. Changes
    - Delete duplicate stage_statuses records
    - Add unique constraint on (project_id, stage_id)
*/

-- First, create a temporary table with the records we want to keep (most recent per project_id + stage_id)
CREATE TEMP TABLE stage_statuses_to_keep AS
SELECT DISTINCT ON (project_id, stage_id) id
FROM stage_statuses
ORDER BY project_id, stage_id, created_at DESC;

-- Delete all stage_statuses that are NOT in the keep list
DELETE FROM stage_statuses
WHERE id NOT IN (SELECT id FROM stage_statuses_to_keep);

-- Add unique constraint to prevent future duplicates
ALTER TABLE stage_statuses
DROP CONSTRAINT IF EXISTS stage_statuses_project_stage_unique;

ALTER TABLE stage_statuses
ADD CONSTRAINT stage_statuses_project_stage_unique
UNIQUE (project_id, stage_id);

-- Drop the temporary table
DROP TABLE stage_statuses_to_keep;
