/*
  # Add item_number column to project_variations

  1. Changes
    - Add `item_number` column to `project_variations` table to store the original item number from the spreadsheet
    - This allows displaying "Variation 2.28rev1" instead of "Variation 1"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_variations' AND column_name = 'item_number'
  ) THEN
    ALTER TABLE project_variations ADD COLUMN item_number text DEFAULT '';
  END IF;
END $$;
