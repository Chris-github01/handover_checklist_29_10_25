-- ================================================================
-- USER IDENTITY MAPPING EXPORT
-- For reconciling users between V1 and V2
-- ================================================================
--
-- PURPOSE: Create user mapping table for migration
-- USAGE: Match V1 users to V2 auth.users by email
-- NOTE: Passwords cannot be exported (security)
--
-- MIGRATION STRATEGY:
-- 1. Export this data
-- 2. In V2, create users via Supabase Auth
-- 3. Map V1 user IDs to V2 auth.uid() using email
-- 4. Update all foreign keys during import
-- ================================================================

-- Full user export with role and contact info
SELECT
  id as v1_user_id,
  email,
  name,
  role,
  created_at as original_created_at,
  NULL as v2_user_id,  -- To be filled during migration
  NULL as migration_status  -- To be filled during migration
FROM users
ORDER BY email;

-- User statistics by role
SELECT
  role,
  COUNT(*) as user_count,
  array_agg(email ORDER BY email) as users
FROM users
GROUP BY role
ORDER BY role;

-- Users with activity (uploaded attachments)
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  COUNT(DISTINCT a.id) as attachments_uploaded,
  COUNT(DISTINCT ic.id) as items_checked,
  MIN(a.uploaded_at) as first_activity,
  MAX(a.uploaded_at) as last_activity
FROM users u
LEFT JOIN attachments a ON a.uploaded_by = u.id
LEFT JOIN item_checks ic ON ic.checked_by = u.id
GROUP BY u.id, u.email, u.name, u.role
ORDER BY u.email;

-- Stage owners
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  COUNT(DISTINCT s.id) as stages_owned,
  array_agg(DISTINCT p.name ORDER BY p.name) as projects
FROM users u
LEFT JOIN stages s ON s.owner_user_id = u.id
LEFT JOIN projects p ON p.id = s.project_id
GROUP BY u.id, u.email, u.name, u.role
HAVING COUNT(DISTINCT s.id) > 0
ORDER BY stages_owned DESC;
