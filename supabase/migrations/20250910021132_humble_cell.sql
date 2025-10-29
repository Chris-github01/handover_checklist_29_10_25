/*
  # Add INSERT policy for projects table

  1. Security Changes
    - Add policy to allow authenticated users to insert projects
    - This enables project creation functionality

  2. Policy Details
    - Allows any authenticated user to create projects
    - Maintains security by requiring authentication
*/

-- Add INSERT policy for projects table
CREATE POLICY "Authenticated users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);