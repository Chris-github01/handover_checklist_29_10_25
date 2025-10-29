/*
  # Handover Checklist Database Schema

  1. New Tables
    - `users` - User accounts with roles
    - `projects` - Project information
    - `stages` - Project stages/steps
    - `stage_items` - Checklist items within stages
    - `item_checks` - Track completion of items
    - `stage_statuses` - Track stage completion status
    - `notifications` - System notifications
    - `attachments` - File attachments
    - `activity_log` - Audit trail

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Role-based access control
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Director', 'QS', 'PM/SM', 'Estimating', 'Commercial', 'QA', 'H&S', 'Read-only')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text NOT NULL,
  start_date_target date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (true);

-- Stages table
CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  owner_role text NOT NULL,
  owner_user_id uuid REFERENCES users(id),
  order_index integer NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage stages"
  ON stages
  FOR ALL
  TO authenticated
  USING (true);

-- Stage items table
CREATE TABLE IF NOT EXISTS stage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stage_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage stage items"
  ON stage_items
  FOR ALL
  TO authenticated
  USING (true);

-- Item checks table
CREATE TABLE IF NOT EXISTS item_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stage_items(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  checked_by uuid REFERENCES users(id),
  checked_at timestamptz DEFAULT now(),
  note text,
  is_checked boolean DEFAULT true
);

ALTER TABLE item_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage item checks"
  ON item_checks
  FOR ALL
  TO authenticated
  USING (true);

-- Stage statuses table
CREATE TABLE IF NOT EXISTS stage_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'na')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stage_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage stage statuses"
  ON stage_statuses
  FOR ALL
  TO authenticated
  USING (true);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  event text NOT NULL,
  to_role text,
  to_user_id uuid REFERENCES users(id),
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (true);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  item_id uuid REFERENCES stage_items(id) ON DELETE CASCADE,
  filename text NOT NULL,
  url text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage attachments"
  ON attachments
  FOR ALL
  TO authenticated
  USING (true);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage activity log"
  ON activity_log
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stages_project_id ON stages(project_id);
CREATE INDEX IF NOT EXISTS idx_stage_items_stage_id ON stage_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_item_checks_item_id ON item_checks(item_id);
CREATE INDEX IF NOT EXISTS idx_item_checks_project_id ON item_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_stage_statuses_stage_id ON stage_statuses(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_statuses_project_id ON stage_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);

-- Insert demo users
INSERT INTO users (id, name, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@optimalfire.com', 'Admin'),
  ('22222222-2222-2222-2222-222222222222', 'QS User', 'qs@optimalfire.com', 'QS'),
  ('33333333-3333-3333-3333-333333333333', 'Pedro Director', 'pedro@optimalfire.com', 'Director'),
  ('44444444-4444-4444-4444-444444444444', 'Sanet Estimating', 'sanet@optimalfire.com', 'Estimating'),
  ('55555555-5555-5555-5555-555555555555', 'Pieter PM', 'pieter@optimalfire.com', 'PM/SM'),
  ('66666666-6666-6666-6666-666666666666', 'Reegan Commercial', 'reegan@optimalfire.com', 'Commercial'),
  ('77777777-7777-7777-7777-777777777777', 'Okkie QA', 'okkie@optimalfire.com', 'QA'),
  ('88888888-8888-8888-8888-888888888888', 'Jacilise H&S', 'jacilise@optimalfire.com', 'H&S')
ON CONFLICT (email) DO NOTHING;