/*
  # Allow Admins and Directors to Delete Projects

  1. Changes
    - Update the project deletion policy to allow both Admin and Director roles
    - Previously only Directors could delete projects
    - Now both Admin and Director roles can delete projects
    
  2. Security
    - DELETE operations restricted to Admin and Director roles only
    - All other policies remain unchanged
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only Directors can delete projects" ON projects;

-- Create new policy allowing both Admins and Directors
CREATE POLICY "Admins and Directors can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Admin', 'Director')
    )
  );
