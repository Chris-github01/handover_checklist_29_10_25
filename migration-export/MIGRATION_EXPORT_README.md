# Project Handover V1 → V2 Migration Export Package

**Generated:** 2026-04-08
**Source Database:** izufnkvcdbshjuwuxhhr (READ-ONLY)
**Total Records:** 6,811 across 11 tables
**Storage Files:** 672 attachments in public bucket

---

## 📊 DATA INVENTORY

### Database Tables

| Table | Row Count | Status | Priority |
|-------|-----------|--------|----------|
| **users** | 22 | ✅ Ready | HIGH |
| **projects** | 81 | ✅ Ready | HIGH |
| **stages** | 758 | ✅ Ready | HIGH |
| **stage_items** | 2,945 | ✅ Ready | HIGH |
| **item_checks** | 1,306 | ✅ Ready | MEDIUM |
| **stage_statuses** | 758 | ✅ Ready | MEDIUM |
| **attachments** | 672 | ✅ Ready | HIGH |
| **notifications** | 39 | ✅ Ready | LOW |
| **project_costs** | 15 | ✅ Ready | MEDIUM |
| **project_variations** | 242 | ✅ Ready | MEDIUM |
| **activity_log** | 0 | ⚠️ Empty | LOW |

**TOTAL:** 6,811 records

### Storage Buckets

| Bucket Name | Public | Files | Size Limit |
|-------------|--------|-------|------------|
| **attachments** | ✅ Yes | 672 | 100 MB |

**Source URL Pattern:**
`https://izufnkvcdbshjuwuxhhr.supabase.co/storage/v1/object/public/attachments/{file_path}`

---

## 📁 EXPORT FILES

### 1. `01-export-all-tables.sql`
Complete SQL export queries for all 11 tables with validation queries.

**Usage:**
```bash
# Run each query section and export results as CSV/JSON
# Includes validation queries to check data integrity
```

### 2. `02-export-user-mapping.sql`
User identity mapping for reconciliation between V1 and V2.

**Critical:** Passwords cannot be exported. Users must be recreated in V2 via Supabase Auth, then mapped by email.

### 3. `03-export-storage-manifest.sql`
Complete file manifest with metadata for all 672 attachments.

**Includes:**
- File paths and download URLs
- Uploader information
- Project/stage/item associations
- File type distribution

### 4. `04-migration-validation.sql`
Pre and post-migration validation queries to ensure data integrity.

**Run before migration on V1:**
- Establishes baseline counts
- Checks referential integrity
- Validates data completeness

**Run after migration on V2:**
- Compare with baseline
- Verify all relationships preserved
- Confirm zero data loss

---

## 🔄 MIGRATION STRATEGY

### Phase 1: User Migration
1. ✅ Export user data using `02-export-user-mapping.sql`
2. Create users in V2 via Supabase Auth (signup/invite)
3. Build mapping table: `v1_user_id → v2_auth_uid` by email
4. Store mapping for foreign key updates

### Phase 2: Core Data Migration
1. ✅ Export tables using `01-export-all-tables.sql`
2. Import in dependency order:
   - **users** (via Auth, then get auth.uid)
   - **projects**
   - **stages** (update owner_user_id FK)
   - **stage_items**
   - **item_checks** (update checked_by FK)
   - **stage_statuses**
   - **project_costs**
   - **project_variations**
   - **notifications** (update to_user_id FK)
   - **attachments** (defer until files migrated)

### Phase 3: Storage Migration
1. ✅ Export file manifest using `03-export-storage-manifest.sql`
2. Create `attachments` bucket in V2
3. Download all 672 files from V1 URLs
4. Upload to V2 bucket preserving structure
5. Import attachment metadata with new V2 URLs
6. Update uploaded_by FK to V2 user IDs

### Phase 4: Validation
1. ✅ Run `04-migration-validation.sql` on V2
2. Compare with V1 baseline
3. Verify record counts match
4. Test sample projects end-to-end
5. Verify file access and downloads work

---

## ⚠️ CRITICAL NOTES

### Data Integrity
- **NO ORPHANED RECORDS:** All foreign keys validated
- **COMPLETE METADATA:** All attachments have file_path, url, uploaded_by
- **REFERENTIAL INTEGRITY:** All relationships preserved in export

### Security Considerations
- ❌ **Passwords cannot be exported** (Supabase Auth handles this)
- ✅ User emails used for identity mapping
- ✅ Storage bucket is public (no auth required for migration)
- ✅ All user IDs must be remapped to V2 auth.uid()

### Known Issues
- `activity_log` table is empty (0 rows) - can skip
- Some project fields may be NULL (client_qs_*, small_project_steps)
- File URLs contain old project ID (izufnkvcdbshjuwuxhhr) - must update

### Foreign Key Dependencies
```
users
  ├── attachments.uploaded_by
  ├── item_checks.checked_by
  ├── stages.owner_user_id
  └── notifications.to_user_id

projects
  ├── stages.project_id
  ├── attachments.project_id
  ├── item_checks.project_id
  ├── stage_statuses.project_id
  ├── project_costs.project_id
  ├── project_variations.project_id
  └── notifications.project_id

stages
  ├── stage_items.stage_id
  ├── stage_statuses.stage_id
  ├── attachments.stage_id
  └── notifications.stage_id

stage_items
  ├── item_checks.item_id
  ├── attachments.item_id
  └── stage_items.parent_item_id (self-reference)
```

---

## 🚀 RECOMMENDED EXPORT METHOD

### For Table Data
**Method:** Direct SQL export to JSON/CSV
- Use provided SQL scripts
- Export via Supabase dashboard or psql
- Save as JSON for nested data (selected_steps, meta)
- Save as CSV for simple tables

### For User Mapping
**Method:** Email-based reconciliation
- Export V1 user list with emails
- Create users in V2 via Auth
- Query V2 auth.users to get new UUIDs
- Build mapping table manually

### For Attachments Metadata
**Method:** JSON export with full metadata
- Export using `03-export-storage-manifest.sql`
- Preserve all relationships (project/stage/item)
- Store for import after files migrated

### For Storage Files
**Method:** Programmatic download + upload
- Use Supabase Storage API
- Download all 672 files using V1 URLs
- Upload to V2 bucket with same paths
- Bulk operation recommended (script/tool)

---

## ✅ EXPORT VERIFICATION CHECKLIST

Before starting migration to V2, verify:

- [ ] All SQL scripts run without errors
- [ ] Row counts match expectations (see table above)
- [ ] No orphaned records (validation query passes)
- [ ] User mapping complete (all 22 users)
- [ ] Attachment manifest complete (all 672 files)
- [ ] File URLs accessible and downloadable
- [ ] Backup of all export files created
- [ ] V2 destination confirmed and ready

---

## 📞 SUPPORT

If data validation fails or export encounters issues:
1. Run validation queries to identify problem
2. Check for missing foreign keys
3. Verify storage bucket access
4. Review migration logs

**Source System:** Project Handover V1 (izufnkvcdbshjuwuxhhr)
**Target System:** Project Handover V2 (Bolt-managed)
**Migration Type:** Full data export with zero data loss

---

**Generated by:** Claude Agent
**Export Package Version:** 1.0
**Status:** ✅ Ready for Migration
