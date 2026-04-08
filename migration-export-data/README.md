# Migration Export Data Package

**Generated:** 2026-04-08
**Source Database:** izufnkvcdbshjuwuxhhr (Supabase)
**Export Method:** Direct SQL export via MCP privileged access

## 📊 Export Summary

This directory contains complete data exports from the Project Handover V1 system, ready for import into Project Handover V2.

### Tables Exported

| Table | Rows | Format | Status |
|-------|------|--------|--------|
| users | 22 | JSON | ✅ Ready |
| projects | 81 | JSON | ✅ Ready |
| stages | 758 | JSON | ✅ Ready |
| stage_items | 2,945 | JSON | ✅ Ready |
| item_checks | 1,306 | JSON | ✅ Ready |
| stage_statuses | 758 | JSON | ✅ Ready |
| notifications | 39 | JSON | ✅ Ready |
| attachments | 672 | JSON | ✅ Ready |
| activity_log | 0 | JSON | ⚠️ Empty |
| project_costs | 15 | JSON | ✅ Ready |
| project_variations | 242 | JSON | ✅ Ready |

**Total Records:** 6,811

## 📁 Files in This Directory

- `users.json` - All user accounts (22 records)
- `projects.json` - All projects (81 records)
- `stages.json` - All project stages (758 records)
- `stage_items.json` - All stage checklist items (2,945 records)
- `item_checks.json` - All item check records (1,306 records)
- `stage_statuses.json` - All stage status records (758 records)
- `notifications.json` - All notification records (39 records)
- `attachments.json` - All attachment metadata (672 records)
- `activity_log.json` - Activity log (0 records - empty table)
- `project_costs.json` - Project cost records (15 records)
- `project_variations.json` - Project variation records (242 records)
- `attachments_file_manifest.json` - Complete file manifest for 672 storage files
- `EXPORT_MANIFEST.json` - Summary manifest of all exports

## 🔄 Import Order

When importing into Project Handover V2, follow this order to preserve foreign key relationships:

1. **users** (via Supabase Auth - create mapping table)
2. **projects**
3. **stages** (update owner_user_id FKs)
4. **stage_items**
5. **item_checks** (update checked_by FKs)
6. **stage_statuses**
7. **project_costs**
8. **project_variations**
9. **notifications** (update to_user_id FKs)
10. **attachments** (after storage files migrated, update uploaded_by FKs)

## ⚠️ Critical Notes

### User ID Remapping Required

All user IDs in V1 are UUIDs that must be mapped to new V2 auth.uid() values:
- Export V1 user emails
- Create users in V2 via Supabase Auth
- Build mapping: `v1_user_id → v2_auth_uid`
- Update all foreign keys during import

### Attachment Files Migration

The `attachments.json` contains metadata only. Actual files must be:
1. Downloaded from V1 storage using URLs in the file
2. Uploaded to V2 storage bucket
3. Metadata imported with new V2 URLs
4. See `attachments_file_manifest.json` for complete file list

### JSON Field Handling

Some fields contain JSON data:
- `projects.selected_steps` (JSONB)
- `projects.small_project_steps` (Array)

Ensure your import process handles these correctly.

## 📋 Data Quality

- ✅ Zero NULL foreign keys
- ✅ All required fields populated
- ✅ No orphaned records
- ✅ Referential integrity verified
- ✅ All 672 attachments have complete metadata

## 🔐 Security

- Passwords NOT included (handled by Supabase Auth)
- User emails used for identity mapping
- All sensitive data preserved
- RLS policies must be recreated in V2

## 📞 Support

For migration assistance or data validation issues, refer to:
- `/migration-export/MIGRATION_EXPORT_README.md`
- `/migration-export/EXPORT_SUMMARY.md`
- `/migration-export/04-migration-validation.sql`
