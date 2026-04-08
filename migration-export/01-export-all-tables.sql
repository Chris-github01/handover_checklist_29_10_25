-- ================================================================
-- PROJECT HANDOVER V1 → V2 MIGRATION EXPORT
-- Full Database Export Script
-- Generated: 2026-04-08
-- ================================================================
--
-- PURPOSE: Export all table data from Project Handover V1
-- TARGET: Import into new Project Handover V2 Bolt app
-- SOURCE DB: izufnkvcdbshjuwuxhhr (OLD - READ ONLY)
--
-- INSTRUCTIONS:
-- 1. Run each query separately
-- 2. Save results as CSV/JSON
-- 3. Review data before importing to V2
-- ================================================================

-- ================================================================
-- TABLE 1: USERS (22 rows)
-- ================================================================
-- Export user accounts with roles and credentials
SELECT
  id,
  name,
  email,
  role,
  created_at
FROM users
ORDER BY created_at;

-- ================================================================
-- TABLE 2: PROJECTS (81 rows)
-- ================================================================
-- Export all projects with metadata and status
SELECT
  id,
  project_code,
  project_title,
  name,
  client,
  status,
  region,
  project_type,
  bwof,
  is_small_project,
  small_project_steps,
  selected_steps,
  site_manager,
  qs,
  client_qs_name,
  client_qs_number,
  client_qs_email,
  start_date_target,
  created_at
FROM projects
ORDER BY created_at;

-- ================================================================
-- TABLE 3: STAGES (758 rows)
-- ================================================================
-- Export all project stages with ownership
SELECT
  id,
  project_id,
  code,
  title,
  owner_role,
  owner_user_id,
  order_index,
  is_required,
  created_at
FROM stages
ORDER BY project_id, order_index;

-- ================================================================
-- TABLE 4: STAGE_ITEMS (2,945 rows)
-- ================================================================
-- Export all checklist items for stages
SELECT
  id,
  stage_id,
  parent_item_id,
  title,
  description,
  order_index,
  is_required,
  requires_all_children,
  created_at
FROM stage_items
ORDER BY stage_id, order_index;

-- ================================================================
-- TABLE 5: ITEM_CHECKS (1,306 rows)
-- ================================================================
-- Export all check completion records
SELECT
  id,
  item_id,
  project_id,
  checked_by,
  is_checked,
  note,
  checked_at
FROM item_checks
ORDER BY project_id, checked_at;

-- ================================================================
-- TABLE 6: STAGE_STATUSES (758 rows)
-- ================================================================
-- Export stage completion status per project
SELECT
  id,
  stage_id,
  project_id,
  status,
  completed_at,
  created_at
FROM stage_statuses
ORDER BY project_id, stage_id;

-- ================================================================
-- TABLE 7: ATTACHMENTS (672 rows)
-- ================================================================
-- Export attachment metadata with file paths
SELECT
  id,
  project_id,
  stage_id,
  item_id,
  filename,
  file_path,
  url,
  uploaded_by,
  uploaded_at
FROM attachments
ORDER BY project_id, uploaded_at;

-- ================================================================
-- TABLE 8: NOTIFICATIONS (39 rows)
-- ================================================================
-- Export notification history
SELECT
  id,
  project_id,
  stage_id,
  event,
  to_role,
  to_user_id,
  subject,
  body,
  sent_at,
  created_at
FROM notifications
ORDER BY created_at;

-- ================================================================
-- TABLE 9: PROJECT_COSTS (15 rows)
-- ================================================================
-- Export financial data per project
SELECT
  id,
  project_id,
  agreed_contract_value,
  contract_works_claimed,
  created_at,
  updated_at
FROM project_costs
ORDER BY project_id;

-- ================================================================
-- TABLE 10: PROJECT_VARIATIONS (242 rows)
-- ================================================================
-- Export variation orders with financial details
SELECT
  id,
  project_id,
  item_number,
  description,
  value,
  claimed_amount,
  order_index,
  created_at
FROM project_variations
ORDER BY project_id, order_index;

-- ================================================================
-- TABLE 11: ACTIVITY_LOG (0 rows)
-- ================================================================
-- Export activity audit log (empty but included for completeness)
SELECT
  id,
  project_id,
  actor_id,
  action,
  meta,
  created_at
FROM activity_log
ORDER BY created_at;

-- ================================================================
-- VALIDATION QUERIES
-- ================================================================

-- Verify row counts match expectations
SELECT
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'stages', COUNT(*) FROM stages
UNION ALL
SELECT 'stage_items', COUNT(*) FROM stage_items
UNION ALL
SELECT 'item_checks', COUNT(*) FROM item_checks
UNION ALL
SELECT 'stage_statuses', COUNT(*) FROM stage_statuses
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'project_costs', COUNT(*) FROM project_costs
UNION ALL
SELECT 'project_variations', COUNT(*) FROM project_variations
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;

-- Check for orphaned records
SELECT
  'Orphaned stages' as issue,
  COUNT(*) as count
FROM stages s
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id)
UNION ALL
SELECT
  'Orphaned stage_items',
  COUNT(*)
FROM stage_items si
WHERE NOT EXISTS (SELECT 1 FROM stages s WHERE s.id = si.stage_id)
UNION ALL
SELECT
  'Orphaned item_checks',
  COUNT(*)
FROM item_checks ic
WHERE NOT EXISTS (SELECT 1 FROM stage_items si WHERE si.id = ic.item_id)
UNION ALL
SELECT
  'Orphaned attachments',
  COUNT(*)
FROM attachments a
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = a.project_id);
