/*
  # Fix stages and stage_items RLS policies

  1. Security
    - Add UPDATE and DELETE policies for stages table
    - Add INSERT, UPDATE, DELETE policies for stage_items table
    - Add INSERT, UPDATE, DELETE policies for stage_statuses table
*/

-- Add missing policies for stages table
CREATE POLICY "Authenticated users can update stages"
  ON stages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stages"
  ON stages
  FOR DELETE
  TO authenticated
  USING (true);

-- Add missing policies for stage_items table
CREATE POLICY "Authenticated users can insert stage items"
  ON stage_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage items"
  ON stage_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stage items"
  ON stage_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Add missing policies for stage_statuses table
CREATE POLICY "Authenticated users can insert stage statuses"
  ON stage_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stage statuses"
  ON stage_statuses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stage statuses"
  ON stage_statuses
  FOR DELETE
  TO authenticated
  USING (true);