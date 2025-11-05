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

function extractFromExcel(uint8Array: Uint8Array): ExtractedData {
  const workbook = XLSX.read(uint8Array, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  
  console.log('Excel rows:', data.length);
  console.log('First 10 rows:', JSON.stringify(data.slice(0, 10), null, 2));
  
  const extractedData: ExtractedData = {
    contractWorks: [],
    variations: [],
  };
  
  let inBaseContract = false;
  let inVariations = false;
  const descriptionMap = new Map<string, string>();
  
  // First pass: collect descriptions
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
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
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
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
      // Find the amount and percentage columns
      let amount = 0;
      let percentage = 0;
      
      // Look for $ amounts and % in the row
      for (let j = 2; j < row.length; j++) {
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

function extractTextFromPDF(uint8Array: Uint8Array): string {
  let text = "";
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  try {
    text = decoder.decode(uint8Array);
    if (text.length > 0) {
      return text;
    }
  } catch (e) {
    console.log('UTF-8 decoding failed, trying byte-by-byte');
  }
  
  text = "";
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
      text += String.fromCharCode(byte);
    }
  }
  
  return text;
}

function extractFromPDF(uint8Array: Uint8Array): ExtractedData {
  const text = extractTextFromPDF(uint8Array);
  console.log('Extracted text length:', text.length);
  
  const extractedData: ExtractedData = {
    contractWorks: [],
    variations: [],
  };
  
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
  console.log('Total lines:', lines.length);
  
  let inBaseContract = false;
  let inVariations = false;
  const descriptionMap = new Map<string, string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^(SI-|VARCO-|OFL-|Quote|Credit:|Alternative|Scope|IFC:|Refer)/i)) {
      const prevLine = i > 0 ? lines[i - 1] : '';
      const varMatch = prevLine.match(/^(\d+\.\d+(?:rev\d?)?)/);
      if (varMatch) {
        const varNum = varMatch[1];
        if (!descriptionMap.has(varNum)) {
          descriptionMap.set(varNum, line.substring(0, 100));
        }
      }
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('BASE CONTRACT')) {
      inBaseContract = true;
      inVariations = false;
      continue;
    }
    
    if (line.includes('VARIATIONS') || line.match(/^Var\s+No/i)) {
      inBaseContract = false;
      inVariations = true;
      continue;
    }
    
    if (line.includes('TOTAL VARIATIONS') || line.includes('SUMMARY')) {
      inVariations = false;
      continue;
    }
    
    if (line.includes('TOTAL BASE CONTRACT')) {
      inBaseContract = false;
      continue;
    }
    
    if (inBaseContract) {
      const contractPattern = /^(1\.\d+)\s+([\d.]+)\s+Sum\s+([\d,]+\.\d{2})\s*\$\s*([\d.]+)%/;
      const match = line.match(contractPattern);
      
      if (match) {
        const itemNum = match[1];
        const amount = parseAmount(match[3]);
        const percentage = parseFloat(match[4]);
        const claimed = amount * (percentage / 100);
        
        extractedData.contractWorks.push({
          description: `Item ${itemNum}`,
          value: amount,
          claimed: claimed,
        });
      }
    }
    
    if (inVariations) {
      const varPattern = /^(\d+\.\d+(?:rev\d?)?)\s+([\d.]+)\s+(Sum|Under Review)\s+(.+)/;
      const match = line.match(varPattern);
      
      if (match) {
        const varNum = match[1];
        const status = match[3];
        const restOfLine = match[4];
        
        let value = 0;
        let percentage = 0;
        
        if (status === 'Under Review') {
          const reviewPattern1 = /\$\s*([\d.]+)%\s+([\d,]+\.\d{2})/;
          const reviewPattern2 = /\$\s*([\d,]+\.\d{2})\s+([\d.]+)%/;
          
          const match1 = restOfLine.match(reviewPattern1);
          const match2 = restOfLine.match(reviewPattern2);
          
          if (match1) {
            percentage = parseFloat(match1[1]);
            value = parseAmount(match1[2]);
          } else if (match2) {
            value = parseAmount(match2[1]);
            percentage = parseFloat(match2[2]);
          }
        } else {
          const sumPattern = /(-?\$?\s*[\d,]+\.\d{2}|-)?\s*\$\s*([\d.]+)%/;
          const sumMatch = restOfLine.match(sumPattern);
          
          if (sumMatch) {
            const amountStr = sumMatch[1];
            if (amountStr && amountStr !== '-') {
              value = parseAmount(amountStr);
            }
            percentage = parseFloat(sumMatch[2]);
          }
        }
        
        if (value === 0 && percentage === 0) continue;
        if (value === 0 && !restOfLine.includes('$')) continue;
        
        const claimed = value * (percentage / 100);
        const description = descriptionMap.get(varNum) || `Variation ${varNum}`;
        
        extractedData.variations.push({
          description: description,
          value: Math.abs(value),
          claimed: Math.abs(claimed),
        });
      }
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
    
    // Check file type
    if (file.name.endsWith('.xlsx') || file.type.includes('spreadsheet')) {
      console.log('Processing as Excel file');
      extractedData = extractFromExcel(uint8Array);
    } else {
      console.log('Processing as PDF file');
      extractedData = extractFromPDF(uint8Array);
    }

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
