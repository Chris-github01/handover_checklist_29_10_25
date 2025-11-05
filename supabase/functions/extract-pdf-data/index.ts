import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedData {
  contractWorks: Array<{
    itemNumber: string;
    description: string;
    value: number;
    claimed: number;
  }>;
  variations: Array<{
    itemNumber: string;
    description: string;
    value: number;
    claimed: number;
  }>;
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return Math.round(val * 100) / 100;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$\s]/g, '').replace(/,/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : Math.round(value * 100) / 100;
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

function combineWrappedColumns(row: any[], startCol: number, endCol: number): string {
  const parts: string[] = [];
  for (let i = startCol; i <= endCol; i++) {
    if (row[i] !== null && row[i] !== undefined && row[i] !== '') {
      parts.push(String(row[i]).trim());
    }
  }
  return parts.join(' ').trim();
}

function extractFromSpreadsheet(uint8Array: Uint8Array, fileType: string): ExtractedData {
  let workbook: XLSX.WorkBook;
  
  if (fileType === 'csv') {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(uint8Array);
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    workbook = XLSX.read(uint8Array, { type: 'array' });
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', range: 12 }) as any[][];
  
  console.log('Total rows from row 13:', data.length);
  console.log('First 5 rows:', JSON.stringify(data.slice(0, 5), null, 2));
  
  const extractedData: ExtractedData = {
    contractWorks: [],
    variations: [],
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const itemNumber = String(row[1] || '').trim();

    if (!itemNumber) continue;

    const isContractWork = itemNumber.match(/^1(\.\d+)*/);

    const isVariation = itemNumber.match(/^2(\.\d+)*/);

    if (!isContractWork && !isVariation) continue;
    
    const description = combineWrappedColumns(row, 2, 9);

    const isCredit = description.toLowerCase().includes('credit:');

    let totalValue = parseAmount(row[12] || 0);
    if (isCredit && totalValue > 0) {
      totalValue = -totalValue;
    }

    const percentage = parsePercentage(row[13] || 0);

    const claimedText = combineWrappedColumns(row, 14, 16);
    let claimedValue = parseAmount(claimedText);
    if (isCredit && claimedValue > 0) {
      claimedValue = -claimedValue;
    }

    const claimed = claimedValue !== 0 ? claimedValue : Math.round(totalValue * (percentage / 100) * 100) / 100;

    if (totalValue === 0) continue;

    const item = {
      itemNumber: itemNumber,
      description: description || `Item ${itemNumber}`,
      value: totalValue,
      claimed: claimed,
    };

    if (isContractWork) {
      console.log('Contract Work:', { row: i + 13, itemNumber, description, totalValue, percentage, claimed });
      extractedData.contractWorks.push(item);
    } else if (isVariation) {
      console.log('Variation:', { row: i + 13, itemNumber, description, totalValue, percentage, claimed });
      extractedData.variations.push(item);
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
    
    let fileType = 'excel';
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      fileType = 'csv';
    }
    
    console.log('Processing as', fileType, 'file (starting from row 13)');
    const extractedData = extractFromSpreadsheet(uint8Array, fileType);

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
