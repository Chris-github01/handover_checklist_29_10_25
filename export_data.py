#!/usr/bin/env python3
import os
import json
from supabase import create_client, Client

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

output_dir = "/tmp/cc-agent/56455764/project/migration-export-data"
os.makedirs(output_dir, exist_ok=True)

tables = {
    "users": "id, name, email, role, created_at",
    "projects": "*",
    "stages": "*",
    "stage_items": "*",
    "item_checks": "*",
    "stage_statuses": "*",
    "notifications": "*",
    "attachments": "*",
    "activity_log": "*",
    "project_costs": "*",
    "project_variations": "*"
}

manifest = []

print("Starting data export...")

for table_name, columns in tables.items():
    print(f"\nExporting {table_name}...")

    try:
        response = supabase.table(table_name).select(columns).execute()
        data = response.data

        filename = f"{table_name}.json"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        row_count = len(data)
        file_size = os.path.getsize(filepath)

        manifest.append({
            "table": table_name,
            "filename": filename,
            "row_count": row_count,
            "file_size_bytes": file_size,
            "format": "JSON",
            "status": "✅ Complete"
        })

        print(f"  ✅ {table_name}: {row_count} rows exported ({file_size:,} bytes)")

    except Exception as e:
        print(f"  ❌ Error exporting {table_name}: {str(e)}")
        manifest.append({
            "table": table_name,
            "filename": filename,
            "row_count": 0,
            "file_size_bytes": 0,
            "format": "JSON",
            "status": f"❌ Error: {str(e)}"
        })

with open(os.path.join(output_dir, "EXPORT_MANIFEST.json"), 'w') as f:
    json.dump({
        "export_date": "2026-04-08",
        "source_database": "izufnkvcdbshjuwuxhhr",
        "total_tables": len(manifest),
        "tables": manifest
    }, f, indent=2)

print("\n" + "="*60)
print("EXPORT COMPLETE")
print("="*60)
print(f"\nExport location: {output_dir}")
print(f"Total tables exported: {len(manifest)}")
print(f"Total rows exported: {sum(m['row_count'] for m in manifest)}")
print("\nManifest created: EXPORT_MANIFEST.json")
