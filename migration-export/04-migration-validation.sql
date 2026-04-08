-- ================================================================
-- MIGRATION DATA VALIDATION QUERIES
-- Run these before and after migration to ensure data integrity
-- ================================================================

-- ================================================================
-- PRE-MIGRATION VALIDATION (Run on V1)
-- ================================================================

-- 1. Record counts (baseline)
SELECT
  'BASELINE_COUNTS' as validation_type,
  json_build_object(
    'users', (SELECT COUNT(*) FROM users),
    'projects', (SELECT COUNT(*) FROM projects),
    'stages', (SELECT COUNT(*) FROM stages),
    'stage_items', (SELECT COUNT(*) FROM stage_items),
    'item_checks', (SELECT COUNT(*) FROM item_checks),
    'stage_statuses', (SELECT COUNT(*) FROM stage_statuses),
    'attachments', (SELECT COUNT(*) FROM attachments),
    'notifications', (SELECT COUNT(*) FROM notifications),
    'project_costs', (SELECT COUNT(*) FROM project_costs),
    'project_variations', (SELECT COUNT(*) FROM project_variations)
  ) as counts;

-- 2. Referential integrity check
SELECT
  'REFERENTIAL_INTEGRITY' as validation_type,
  json_build_object(
    'orphaned_stages', (
      SELECT COUNT(*) FROM stages s
      WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id)
    ),
    'orphaned_stage_items', (
      SELECT COUNT(*) FROM stage_items si
      WHERE NOT EXISTS (SELECT 1 FROM stages s WHERE s.id = si.stage_id)
    ),
    'orphaned_item_checks', (
      SELECT COUNT(*) FROM item_checks ic
      WHERE NOT EXISTS (SELECT 1 FROM stage_items si WHERE si.id = ic.item_id)
    ),
    'orphaned_stage_statuses', (
      SELECT COUNT(*) FROM stage_statuses ss
      WHERE NOT EXISTS (SELECT 1 FROM stages s WHERE s.id = ss.stage_id)
    ),
    'orphaned_attachments', (
      SELECT COUNT(*) FROM attachments a
      WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = a.project_id)
    )
  ) as orphaned_records;

-- 3. Data completeness check
SELECT
  'DATA_COMPLETENESS' as validation_type,
  json_build_object(
    'projects_with_stages', (
      SELECT COUNT(DISTINCT project_id) FROM stages
    ),
    'stages_with_items', (
      SELECT COUNT(DISTINCT stage_id) FROM stage_items
    ),
    'items_with_checks', (
      SELECT COUNT(DISTINCT item_id) FROM item_checks
    ),
    'projects_with_attachments', (
      SELECT COUNT(DISTINCT project_id) FROM attachments
    ),
    'users_with_activity', (
      SELECT COUNT(DISTINCT u.id) FROM users u
      WHERE EXISTS (SELECT 1 FROM attachments a WHERE a.uploaded_by = u.id)
         OR EXISTS (SELECT 1 FROM item_checks ic WHERE ic.checked_by = u.id)
    )
  ) as completeness;

-- 4. Project status distribution
SELECT
  'PROJECT_STATUS' as validation_type,
  status,
  COUNT(*) as count
FROM projects
GROUP BY status
ORDER BY count DESC;

-- 5. Stage completion summary
SELECT
  'STAGE_COMPLETION' as validation_type,
  status,
  COUNT(*) as count
FROM stage_statuses
GROUP BY status
ORDER BY count DESC;

-- 6. User role distribution
SELECT
  'USER_ROLES' as validation_type,
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;

-- 7. Attachment file integrity
SELECT
  'ATTACHMENT_INTEGRITY' as validation_type,
  json_build_object(
    'total', COUNT(*),
    'with_file_path', COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END),
    'with_url', COUNT(CASE WHEN url IS NOT NULL THEN 1 END),
    'with_uploader', COUNT(CASE WHEN uploaded_by IS NOT NULL THEN 1 END),
    'complete_records', COUNT(CASE WHEN file_path IS NOT NULL AND url IS NOT NULL AND uploaded_by IS NOT NULL THEN 1 END)
  ) as attachment_stats
FROM attachments;

-- 8. Critical relationships count
SELECT
  'CRITICAL_RELATIONSHIPS' as validation_type,
  json_build_object(
    'project_stage_links', (SELECT COUNT(*) FROM stages WHERE project_id IS NOT NULL),
    'stage_item_links', (SELECT COUNT(*) FROM stage_items WHERE stage_id IS NOT NULL),
    'check_item_links', (SELECT COUNT(*) FROM item_checks WHERE item_id IS NOT NULL),
    'check_project_links', (SELECT COUNT(*) FROM item_checks WHERE project_id IS NOT NULL),
    'attachment_project_links', (SELECT COUNT(*) FROM attachments WHERE project_id IS NOT NULL)
  ) as relationship_counts;

-- ================================================================
-- POST-MIGRATION VALIDATION (Run on V2)
-- ================================================================
-- Copy these queries and run on V2 after import
-- Compare results with pre-migration baseline

-- V2 Validation Query (run after import)
/*
SELECT
  'POST_MIGRATION_COUNTS' as validation_type,
  json_build_object(
    'users', (SELECT COUNT(*) FROM users),
    'projects', (SELECT COUNT(*) FROM projects),
    'stages', (SELECT COUNT(*) FROM stages),
    'stage_items', (SELECT COUNT(*) FROM stage_items),
    'item_checks', (SELECT COUNT(*) FROM item_checks),
    'stage_statuses', (SELECT COUNT(*) FROM stage_statuses),
    'attachments', (SELECT COUNT(*) FROM attachments),
    'notifications', (SELECT COUNT(*) FROM notifications),
    'project_costs', (SELECT COUNT(*) FROM project_costs),
    'project_variations', (SELECT COUNT(*) FROM project_variations)
  ) as counts;
*/
