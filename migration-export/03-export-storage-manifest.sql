-- ================================================================
-- STORAGE BUCKET FILE MANIFEST
-- Complete list of files to migrate from V1 → V2
-- ================================================================
--
-- BUCKET INFO:
-- Name: attachments
-- Public: true
-- File Size Limit: 100 MB (104857600 bytes)
-- Allowed MIME Types: null (all types allowed)
--
-- TOTAL FILES: 672
-- SOURCE URLs: https://izufnkvcdbshjuwuxhhr.supabase.co/storage/v1/object/public/attachments/
--
-- MIGRATION STRATEGY:
-- 1. Download all files from source bucket using file_path
-- 2. Upload to V2 bucket with same structure
-- 3. Update attachment records with new V2 URLs
-- 4. Preserve uploaded_by and uploaded_at metadata
-- ================================================================

-- Complete file manifest with all metadata
SELECT
  a.id as attachment_id,
  a.file_path,
  a.filename,
  a.url as v1_url,
  a.project_id,
  a.stage_id,
  a.item_id,
  a.uploaded_by,
  a.uploaded_at,
  u.email as uploader_email,
  u.name as uploader_name,
  p.name as project_name,
  p.project_code,
  s.title as stage_title,
  si.title as item_title
FROM attachments a
LEFT JOIN users u ON u.id = a.uploaded_by
LEFT JOIN projects p ON p.id = a.project_id
LEFT JOIN stages s ON s.id = a.stage_id
LEFT JOIN stage_items si ON si.id = a.item_id
ORDER BY a.project_id, a.uploaded_at;

-- Files grouped by project
SELECT
  p.id as project_id,
  p.project_code,
  p.name as project_name,
  COUNT(*) as file_count,
  array_agg(a.filename ORDER BY a.uploaded_at) as files
FROM attachments a
JOIN projects p ON p.id = a.project_id
GROUP BY p.id, p.project_code, p.name
ORDER BY file_count DESC;

-- File type distribution
SELECT
  CASE
    WHEN filename LIKE '%.pdf' THEN 'PDF'
    WHEN filename LIKE '%.jpg' OR filename LIKE '%.jpeg' THEN 'JPEG'
    WHEN filename LIKE '%.png' THEN 'PNG'
    WHEN filename LIKE '%.doc%' THEN 'Word'
    WHEN filename LIKE '%.xls%' THEN 'Excel'
    WHEN filename LIKE '%.zip' THEN 'ZIP'
    ELSE 'Other'
  END as file_type,
  COUNT(*) as count
FROM attachments
GROUP BY file_type
ORDER BY count DESC;

-- Downloadable URLs list for batch download
SELECT
  file_path,
  url as download_url,
  filename
FROM attachments
ORDER BY file_path;

-- Check for duplicate filenames (potential conflicts)
SELECT
  filename,
  COUNT(*) as duplicate_count,
  array_agg(id) as attachment_ids
FROM attachments
GROUP BY filename
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Files by uploader
SELECT
  u.email,
  u.name,
  COUNT(*) as files_uploaded
FROM attachments a
JOIN users u ON u.id = a.uploaded_by
GROUP BY u.email, u.name
ORDER BY files_uploaded DESC;
