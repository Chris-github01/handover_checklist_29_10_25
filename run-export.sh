#!/bin/bash

# Export all table data from Project Handover V1 to JSON files
# Uses Supabase connection via environment variables

set -e

OUTPUT_DIR="/tmp/cc-agent/56455764/project/migration-export-data"
mkdir -p "$OUTPUT_DIR"

# Get connection details from .env
source .env

# Construct PostgreSQL connection string
# Note: This uses the pooler connection for better performance
DB_URL="${VITE_SUPABASE_URL/https:\/\//}"
DB_URL="postgresql://postgres.izufnkvcdbshjuwuxhhr:${SUPABASE_DB_PASSWORD:-Qe2IHcTbcjUARDOX}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

echo "🚀 Starting Project Handover V1 Data Export"
echo "============================================"
echo ""
echo "Source: izufnkvcdbshjuwuxhhr.supabase.co"
echo "Output: $OUTPUT_DIR"
echo ""

# Export function
export_table() {
    local table_name=$1
    local output_file="$OUTPUT_DIR/${table_name}.json"

    echo "📦 Exporting $table_name..."

    # Use COPY to export as JSON
    psql "$DB_URL" -t -A -c "SELECT json_agg(t)::text FROM $table_name t;" > "$output_file" 2>&1 || {
        echo "  ❌ Failed to export $table_name"
        echo "[]" > "$output_file"
        return 1
    }

    # Clean up the output (remove extra quotes if any)
    sed -i 's/^"//; s/"$//' "$output_file" 2>/dev/null || true

    # Count rows
    row_count=$(jq 'length' "$output_file" 2>/dev/null || echo "0")
    file_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "0")

    echo "  ✅ $table_name: $row_count rows ($(numfmt --to=iec-i --suffix=B $file_size 2>/dev/null || echo ${file_size}B))"
}

# Export all tables
export_table "users"
export_table "projects"
export_table "stages"
export_table "stage_items"
export_table "item_checks"
export_table "stage_statuses"
export_table "notifications"
export_table "attachments"
export_table "activity_log"
export_table "project_costs"
export_table "project_variations"

echo ""
echo "✨ Export complete!"
echo ""
echo "Files created in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*.json 2>/dev/null || echo "No files created"
