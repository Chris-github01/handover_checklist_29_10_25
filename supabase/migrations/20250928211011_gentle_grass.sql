/*
  # Update contracts user for proper authentication

  This migration removes the existing contracts user profile so it can be properly
  created through the sign-up process with the correct auth user ID.
*/

-- Remove the existing contracts user profile so it can be recreated properly
DELETE FROM users WHERE email = 'contracts@optimalfire.co.nz';

-- The user will need to sign up through the application to create both
-- the auth user and the properly linked profile