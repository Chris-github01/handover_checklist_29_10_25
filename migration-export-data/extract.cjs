const fs = require('fs');
const files = [
  { path: '/tmp/cc-agent/56455764/.claude/projects/-tmp-cc-agent-56455764-project/0392b82d-a9a3-4bf4-a489-8e5f99d88e04/tool-results/mcp-supabase-execute_sql-1775624073069.txt', table: 'stages' },
  { path: '/tmp/cc-agent/56455764/.claude/projects/-tmp-cc-agent-56455764-project/0392b82d-a9a3-4bf4-a489-8e5f99d88e04/tool-results/mcp-supabase-execute_sql-1775624076052.txt', table: 'stage_items' },
  { path: '/tmp/cc-agent/56455764/.claude/projects/-tmp-cc-agent-56455764-project/0392b82d-a9a3-4bf4-a489-8e5f99d88e04/tool-results/mcp-supabase-execute_sql-1775624079007.txt', table: 'item_checks' }
];
files.forEach(({path, table}) => {
  try {
    const content = fs.readFileSync(path, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && parsed[0] && parsed[0].text) {
      const sqlResult = JSON.parse(parsed[0].text);
      if (sqlResult && sqlResult[0] && sqlResult[0].data) {
        const data = JSON.parse(sqlResult[0].data);
        fs.writeFileSync(table + '.json', JSON.stringify(data, null, 2));
        console.log('Created ' + table + '.json with ' + data.length + ' rows');
      } else if (sqlResult && sqlResult[0] && sqlResult[0].json_agg) {
        fs.writeFileSync(table + '.json', sqlResult[0].json_agg);
        const dataCheck = JSON.parse(sqlResult[0].json_agg);
        console.log('Created ' + table + '.json with ' + dataCheck.length + ' rows');
      }
    }
  } catch (e) {
    console.log('Error with ' + table + ': ' + e.message.slice(0, 80));
  }
});
