/*
  # Fix User Registration RLS Policies

  1. Security Updates
    - Update INSERT policy to allow users to create their own profile during registration
    - Ensure users can only create profiles with their own auth.uid()
    - Maintain security while allowing proper registration flow

  2. Changes
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that works with Supabase auth flow
    - Keep existing SELECT and UPDATE policies intact
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a new INSERT policy that allows users to create their own profile
CREATE POLICY "Users can insert own profile during registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the existing SELECT policies are correct
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can read all user profiles" ON users;

-- Create a comprehensive SELECT policy
CREATE POLICY "Users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure UPDATE policy is correct
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create UPDATE policy
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);