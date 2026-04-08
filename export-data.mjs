import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const outputDir = '/tmp/cc-agent/56455764/project/migration-export-data';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const tables = [
  'users',
  'projects',
  'stages',
  'stage_items',
  'item_checks',
  'stage_statuses',
  'notifications',
  'attachments',
  'activity_log',
  'project_costs',
  'project_variations'
];

const manifest = [];

console.log('Starting data export...\n');

for (const tableName of tables) {
  console.log(`Exporting ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) throw error;

    const filename = `${tableName}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    const stats = fs.statSync(filepath);
    const rowCount = data.length;

    manifest.push({
      table: tableName,
      filename: filename,
      row_count: rowCount,
      file_size_bytes: stats.size,
      format: 'JSON',
      status: '✅ Complete'
    });

    console.log(`  ✅ ${tableName}: ${rowCount} rows exported (${stats.size.toLocaleString()} bytes)`);

  } catch (error) {
    console.log(`  ❌ Error exporting ${tableName}: ${error.message}`);
    manifest.push({
      table: tableName,
      filename: `${tableName}.json`,
      row_count: 0,
      file_size_bytes: 0,
      format: 'JSON',
      status: `❌ Error: ${error.message}`
    });
  }
}

const manifestData = {
  export_date: new Date().toISOString().split('T')[0],
  source_database: 'izufnkvcdbshjuwuxhhr',
  total_tables: manifest.length,
  total_rows: manifest.reduce((sum, m) => sum + m.row_count, 0),
  total_size_bytes: manifest.reduce((sum, m) => sum + m.file_size_bytes, 0),
  tables: manifest
};

fs.writeFileSync(
  path.join(outputDir, 'EXPORT_MANIFEST.json'),
  JSON.stringify(manifestData, null, 2)
);

console.log('\n' + '='.repeat(60));
console.log('EXPORT COMPLETE');
console.log('='.repeat(60));
console.log(`\nExport location: ${outputDir}`);
console.log(`Total tables exported: ${manifest.length}`);
console.log(`Total rows exported: ${manifestData.total_rows.toLocaleString()}`);
console.log(`Total size: ${(manifestData.total_size_bytes / 1024 / 1024).toFixed(2)} MB`);
console.log('\nManifest created: EXPORT_MANIFEST.json');
