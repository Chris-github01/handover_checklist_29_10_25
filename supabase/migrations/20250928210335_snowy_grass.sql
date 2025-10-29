/*
  # Add Quenique Du Plessies user

  1. New User
    - `users` table
      - `id` (uuid, will be set when they sign up)
      - `name` (Quenique Du Plessies)
      - `email` (contracts@optimalfire.co.nz)
      - `role` (Commercial)

  Note: The password will need to be set when the user signs up through the application.
  This migration only creates the user profile record.
*/

-- Insert the new user profile
-- Note: The user will need to sign up through the application to create their auth account
-- This creates their profile record that will be linked when they sign up

INSERT INTO users (
  id,
  name,
  email,
  role,
  created_at
) VALUES (
  gen_random_uuid(),
  'Quenique Du Plessies',
  'contracts@optimalfire.co.nz',
  'Commercial',
  now()
) ON CONFLICT (email) DO NOTHING;