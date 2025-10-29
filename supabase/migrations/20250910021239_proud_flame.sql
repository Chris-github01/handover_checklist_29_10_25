/*
  # Add INSERT policy for stages table

  1. Security
    - Add policy for authenticated users to insert stages
    - Allows any authenticated user to create stages for projects
*/

CREATE POLICY "Authenticated users can insert stages"
  ON stages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);