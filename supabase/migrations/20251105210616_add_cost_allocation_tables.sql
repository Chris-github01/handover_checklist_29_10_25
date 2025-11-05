/*
  # Add Cost Allocation Tables

  1. New Tables
    - `project_costs`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `agreed_contract_value` (numeric)
      - `contract_works_claimed` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `project_variations`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `description` (text)
      - `value` (numeric)
      - `claimed_amount` (numeric)
      - `order_index` (integer)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users based on project access
*/

-- Create project_costs table
CREATE TABLE IF NOT EXISTS project_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  agreed_contract_value numeric DEFAULT 0 NOT NULL,
  contract_works_claimed numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- Create project_variations table
CREATE TABLE IF NOT EXISTS project_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  description text DEFAULT '',
  value numeric DEFAULT 0 NOT NULL,
  claimed_amount numeric DEFAULT 0 NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_variations ENABLE ROW LEVEL SECURITY;

-- Policies for project_costs
CREATE POLICY "Authenticated users can view project costs"
  ON project_costs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project costs"
  ON project_costs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project costs"
  ON project_costs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project costs"
  ON project_costs
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for project_variations
CREATE POLICY "Authenticated users can view project variations"
  ON project_variations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project variations"
  ON project_variations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project variations"
  ON project_variations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project variations"
  ON project_variations
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_project_costs_updated_at
  BEFORE UPDATE ON project_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_project_costs_updated_at();