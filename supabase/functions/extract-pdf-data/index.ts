import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedData {
  contractWorks: Array<{
    description: string;
    value: number;
    claimed: number;
  }>;
  variations: Array<{
    description: string;
    value: number;
    claimed: number;
  }>;
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return Math.abs(val);
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$\s]/g, '').replace(/,/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : Math.abs(value);
  }
  return 0;
}

function parsePercentage(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/%/g, '').trim();
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }
  return 0;
}

function extractFromSpreadsheet(uint8Array: Uint8Array, fileType: string): ExtractedData {
  // For CSV files, specify the type as 'string' and decode first
  let workbook: XLSX.WorkBook;
  
  if (fileType === 'csv') {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(uint8Array);
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    // For Excel files (.xlsx, .xls)
    workbook = XLSX.read(uint8Array, { type: 'array' });
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Read with all data
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', range: 0 }) as any[][];
  
  // Filter each row to only include columns A-Q (indices 0-16)
  const filteredData = data.map(row => row.slice(0, 17));
  
  console.log('Total rows:', filteredData.length);
  console.log('First 10 rows (columns A-Q only):', JSON.stringify(filteredData.slice(0, 10), null, 2));
  
  const extractedData: ExtractedData = {
    contractWorks: [],
    variations: [],
  };
  
  let inBaseContract = false;
  let inVariations = false;
  const descriptionMap = new Map<string, string>();
  
  // First pass: collect descriptions
  for (let i = 0; i < filteredData.length; i++) {
    const row = filteredData[i];
    if (!row || row.length === 0) continue;
    
    const firstCol = String(row[0] || '').trim();
    const secondCol = String(row[1] || '').trim();
    
    // Check if this is a variation number followed by a description
    if (firstCol.match(/^\d+\.\d+(?:rev\d?)?$/)) {
      if (secondCol.match(/^(SI-|VARCO-|OFL-|Quote|Credit|Alternative|Scope|IFC|Refer)/i)) {
        descriptionMap.set(firstCol, secondCol);
      }
    }
  }
  
  console.log('Description map:', Array.from(descriptionMap.entries()));
  
  // Second pass: extract data
  for (let i = 0; i < filteredData.length; i++) {
    const row = filteredData[i];
    if (!row || row.length === 0) continue;
    
    const firstCol = String(row[0] || '').trim();
    
    if (firstCol.includes('BASE CONTRACT')) {
      inBaseContract = true;
      inVariations = false;
      console.log('Found BASE CONTRACT at row', i);
      continue;
    }
    
    if (firstCol.includes('VARIATIONS') || firstCol.match(/^Var\s+No/i)) {
      inBaseContract = false;
      inVariations = true;
      console.log('Found VARIATIONS at row', i);
      continue;
    }
    
    if (firstCol.includes('TOTAL VARIATIONS') || firstCol.includes('SUMMARY')) {
      inVariations = false;
      console.log('End of variations at row', i);
      continue;
    }
    
    if (firstCol.includes('TOTAL BASE CONTRACT')) {
      inBaseContract = false;
      console.log('End of base contract at row', i);
      continue;
    }
    
    // Parse BASE CONTRACT items (1.x)
    if (inBaseContract && firstCol.match(/^1\.\d+$/)) {
      const amount = parseAmount(row[3] || 0);
      const percentage = parsePercentage(row[4] || 0);
      const claimed = amount * (percentage / 100);
      
      if (amount > 0) {
        console.log('Contract item:', { row: i, item: firstCol, amount, percentage, claimed });
        extractedData.contractWorks.push({
          description: `Item ${firstCol}`,
          value: amount,
          claimed: claimed,
        });
      }
    }
    
    // Parse VARIATION items (2.x)
    if (inVariations && firstCol.match(/^\d+\.\d+(?:rev\d?)?$/)) {
      // Look for amount and percentage in columns A-Q only
      let amount = 0;
      let percentage = 0;
      
      // Look for $ amounts and % in the row (up to column Q)
      for (let j = 2; j < Math.min(row.length, 17); j++) {
        const cell = row[j];
        if (cell === null || cell === undefined || cell === '') continue;
        
        const cellStr = String(cell).trim();
        
        // Check if this looks like a percentage
        if (cellStr.includes('%') || (typeof cell === 'number' && cell <= 100 && j > 3)) {
          const pct = parsePercentage(cell);
          if (pct > 0 && pct <= 100) {
            percentage = pct;
          }
        }
        
        // Check if this looks like a currency amount
        if ((cellStr.includes('$') || typeof cell === 'number') && !cellStr.includes('%')) {
          const amt = parseAmount(cell);
          if (amt > 0) {
            amount = amt;
          }
        }
      }
      
      // Skip empty items
      if (amount === 0 && percentage === 0) {
        continue;
      }
      
      const claimed = amount * (percentage / 100);
      const description = descriptionMap.get(firstCol) || `Variation ${firstCol}`;
      
      console.log('Variation:', { row: i, var: firstCol, description, amount, percentage, claimed });
      
      extractedData.variations.push({
        description: description,
        value: amount,
        claimed: claimed,
      });
    }
  }
  
  return extractedData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let extractedData: ExtractedData;
    
    // Determine file type
    let fileType = 'excel';
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      fileType = 'csv';
    }
    
    console.log('Processing as', fileType, 'file (columns A-Q only)');
    extractedData = extractFromSpreadsheet(uint8Array, fileType);

    console.log('Extraction complete. Contract works:', extractedData.contractWorks.length, 'Variations:', extractedData.variations.length);

    return new Response(
      JSON.stringify(extractedData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error extracting data:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to extract data",
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
