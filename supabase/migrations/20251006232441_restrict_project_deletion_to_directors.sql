/*
  # Restrict Project Deletion to Directors

  1. Changes
    - Drop existing overly permissive policies on projects table
    - Create new restrictive policies that separate SELECT, INSERT, UPDATE, and DELETE operations
    - Only Directors can delete projects
    - All authenticated users can view projects
    - All authenticated users can create projects
    - All authenticated users can update projects (for general project management)
    
  2. Security
    - DELETE operations restricted to Director role only
    - Other operations remain accessible to authenticated users
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "All authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;

-- Create specific policies for each operation
CREATE POLICY "Authenticated users can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only Directors can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Director'
    )
  );
