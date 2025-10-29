/*
  # Initial Database Schema for Project Handover Checklist

  1. New Tables
    - `users` - User profiles with roles and permissions
    - `projects` - Project information and metadata  
    - `stages` - Project stages/phases in the handover process
    - `stage_items` - Individual checklist items within each stage
    - `item_checks` - Records of completed checklist items
    - `stage_statuses` - Current status of each stage per project
    - `notifications` - Email notification queue and history
    - `attachments` - File attachments for stages and items
    - `activity_log` - Audit trail of all user actions

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Users can view all projects but only edit assigned stages
    - Admin users have full access to all operations

  3. Indexes
    - Add performance indexes for common query patterns
    - Composite indexes for project/stage/item relationships
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Director', 'QS', 'PM/SM', 'Estimating', 'Commercial', 'QA', 'H&S', 'Read-only')),
  created_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text NOT NULL,
  start_date_target date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at timestamptz DEFAULT now()
);

-- Stages table
CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  owner_role text NOT NULL,
  owner_user_id uuid REFERENCES users(id),
  order_index integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Stage items table
CREATE TABLE IF NOT EXISTS stage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_required boolean DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Item checks table
CREATE TABLE IF NOT EXISTS item_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES stage_items(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  checked_by uuid REFERENCES users(id),
  checked_at timestamptz DEFAULT now(),
  note text,
  is_checked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Stage statuses table
CREATE TABLE IF NOT EXISTS stage_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'na')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stage_id, project_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('stage_completed', 'contract_awarded', 'contract_final', 'qa_loaded', 'handover_to_sms', 'sssp_sent')),
  to_role text,
  to_user_id uuid REFERENCES users(id),
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

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

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile and all other user names/roles
CREATE POLICY "Users can read all user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Everyone can view projects
CREATE POLICY "All authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/modify projects
CREATE POLICY "Admins can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Everyone can view stages
CREATE POLICY "All authenticated users can view stages"
  ON stages FOR SELECT
  TO authenticated
  USING (true);

-- Everyone can view stage items
CREATE POLICY "All authenticated users can view stage items"
  ON stage_items FOR SELECT
  TO authenticated
  USING (true);

-- Users can view all item checks
CREATE POLICY "All authenticated users can view item checks"
  ON item_checks FOR SELECT
  TO authenticated
  USING (true);

-- Users can create/update item checks for stages they own
CREATE POLICY "Users can manage item checks for their stages"
  ON item_checks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stage_items si
      JOIN stages s ON si.stage_id = s.id
      JOIN users u ON u.id = auth.uid()
      WHERE si.id = item_checks.item_id
      AND (
        u.role = 'Admin'
        OR s.owner_role = u.role
        OR s.owner_user_id = u.id
      )
    )
  );

-- Everyone can view stage statuses
CREATE POLICY "All authenticated users can view stage statuses"
  ON stage_statuses FOR SELECT
  TO authenticated
  USING (true);

-- Users can update stage statuses for stages they own
CREATE POLICY "Users can update stage statuses for their stages"
  ON stage_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stages s
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = stage_statuses.stage_id
      AND (
        u.role = 'Admin'
        OR s.owner_role = u.role
        OR s.owner_user_id = u.id
      )
    )
  );

-- Everyone can view activity logs
CREATE POLICY "All authenticated users can view activity logs"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

-- Users can create activity logs
CREATE POLICY "Users can create activity logs"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Notifications policies (restrict to system functions)
CREATE POLICY "All authenticated users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

-- Attachments policies
CREATE POLICY "All authenticated users can view attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage attachments"
  ON attachments FOR ALL
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_stages_project_id ON stages(project_id);
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_stage_items_stage_id ON stage_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_items_order ON stage_items(stage_id, order_index);
CREATE INDEX IF NOT EXISTS idx_item_checks_project_item ON item_checks(project_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stage_statuses_project_stage ON stage_statuses(project_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id, created_at DESC);

-- Insert demo users
INSERT INTO users (id, name, email, role) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@optimalfire.com', 'Admin'),
  ('22222222-2222-2222-2222-222222222222', 'John Smith', 'qs@optimalfire.com', 'QS'),
  ('33333333-3333-3333-3333-333333333333', 'Pedro Martinez', 'pedro@optimalfire.com', 'Director'),
  ('44444444-4444-4444-4444-444444444444', 'Sanet Williams', 'sanet@optimalfire.com', 'Estimating'),
  ('55555555-5555-5555-5555-555555555555', 'Okkie van der Merwe', 'okkie@optimalfire.com', 'QA'),
  ('66666666-6666-6666-6666-666666666666', 'Jacilise Steenkamp', 'jacilise@optimalfire.com', 'H&S'),
  ('77777777-7777-7777-7777-777777777777', 'Reegan Johnson', 'reegan@optimalfire.com', 'Commercial'),
  ('88888888-8888-8888-8888-888888888888', 'Ali Hassan', 'ali@optimalfire.com', 'PM/SM')
ON CONFLICT (id) DO NOTHING;