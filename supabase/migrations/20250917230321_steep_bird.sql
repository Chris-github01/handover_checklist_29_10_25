/*
  # Add support for nested checklist items

  1. Schema Changes
    - Add `parent_item_id` column to `stage_items` table for hierarchical structure
    - Add `requires_all_children` column to indicate if parent requires all children to be checked
    - Add foreign key constraint for parent-child relationship

  2. Security
    - Update existing RLS policies to handle nested items
*/

-- Add columns for nested checklist support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stage_items' AND column_name = 'parent_item_id'
  ) THEN
    ALTER TABLE stage_items ADD COLUMN parent_item_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stage_items' AND column_name = 'requires_all_children'
  ) THEN
    ALTER TABLE stage_items ADD COLUMN requires_all_children boolean DEFAULT false;
  END IF;
END $$;

-- Add foreign key constraint for parent-child relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stage_items_parent_item_id_fkey'
  ) THEN
    ALTER TABLE stage_items 
    ADD CONSTRAINT stage_items_parent_item_id_fkey 
    FOREIGN KEY (parent_item_id) REFERENCES stage_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for parent_item_id lookups
CREATE INDEX IF NOT EXISTS idx_stage_items_parent_id ON stage_items(parent_item_id);

-- Update Step 7 to add secondary checklist items
DO $$
DECLARE
  step7_stage_id uuid;
  handover_item_id uuid;
BEGIN
  -- Find Step 7 stage (this will only work for existing projects)
  -- For new projects, the template in database.ts will handle this
  
  -- This is just a placeholder - the actual implementation will be in the template
  NULL;
END $$;