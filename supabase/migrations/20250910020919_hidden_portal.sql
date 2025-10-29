/*
  # Add Chris user to the system

  1. New User
    - Email: chris@optimalfire.co.nz
    - Role: PM/SM (Site Manager)
    - Password will need to be set through Supabase auth

  2. Security
    - User will be added to the users table
    - RLS policies will apply automatically
*/

-- Insert the user into the users table
-- Note: The user will need to be created in Supabase Auth separately with the password
INSERT INTO users (id, name, email, role, created_at) VALUES 
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Chris',
  'chris@optimalfire.co.nz',
  'PM/SM',
  now()
) ON CONFLICT (email) DO NOTHING;