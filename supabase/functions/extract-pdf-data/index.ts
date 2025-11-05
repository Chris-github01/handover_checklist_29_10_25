import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

function parseAmount(str: string): number {
  const cleaned = str.replace(/[$\s]/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function extractTextFromPDF(uint8Array: Uint8Array): string {
  let text = "";
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  // Try UTF-8 decoding first
  try {
    text = decoder.decode(uint8Array);
    if (text.length > 0) {
      return text;
    }
  } catch (e) {
    console.log('UTF-8 decoding failed, trying byte-by-byte');
  }
  
  // Fallback: byte-by-byte extraction
  text = "";
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
      text += String.fromCharCode(byte);
    }
  }
  
  return text;
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

    console.log('Processing file:', file.name, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const text = extractTextFromPDF(uint8Array);
    console.log('Extracted text length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    const extractedData: ExtractedData = {
      contractWorks: [],
      variations: [],
    };

    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    console.log('Total lines:', lines.length);
    
    let inBaseContract = false;
    let inVariations = false;
    const descriptionMap = new Map<string, string>();
    
    // First pass: collect all descriptions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for variation descriptions
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

    console.log('Description map size:', descriptionMap.size);
    
    // Second pass: extract values
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('BASE CONTRACT')) {
        inBaseContract = true;
        inVariations = false;
        console.log('Found BASE CONTRACT section at line', i);
        continue;
      }
      
      if (line.includes('VARIATIONS') || line.match(/^Var\s+No/i)) {
        inBaseContract = false;
        inVariations = true;
        console.log('Found VARIATIONS section at line', i);
        continue;
      }
      
      if (line.includes('TOTAL VARIATIONS') || line.includes('SUMMARY')) {
        inVariations = false;
        console.log('End of variations at line', i);
        continue;
      }
      
      if (line.includes('TOTAL BASE CONTRACT')) {
        inBaseContract = false;
        console.log('End of base contract at line', i);
        continue;
      }
      
      // Parse BASE CONTRACT items (1.x)
      if (inBaseContract) {
        const contractPattern = /^(1\.\d+)\s+([\d.]+)\s+Sum\s+([\d,]+\.\d{2})\s*\$\s*([\d.]+)%/;
        const match = line.match(contractPattern);
        
        if (match) {
          const itemNum = match[1];
          const amount = parseAmount(match[3]);
          const percentage = parseFloat(match[4]);
          const claimed = amount * (percentage / 100);
          
          console.log('Found contract item:', { line: i, itemNum, amount, percentage, claimed });
          
          extractedData.contractWorks.push({
            description: `Item ${itemNum}`,
            value: amount,
            claimed: claimed,
          });
        }
      }
      
      // Parse VARIATION items (2.x)
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
          
          // Skip items with no value
          if (value === 0 && percentage === 0) {
            console.log('Skipping empty variation:', varNum);
            continue;
          }
          
          if (value === 0 && !restOfLine.includes('$')) {
            console.log('Skipping header:', varNum);
            continue;
          }
          
          const claimed = value * (percentage / 100);
          const description = descriptionMap.get(varNum) || `Variation ${varNum}`;
          
          console.log('Found variation:', { line: i, varNum, description, value, percentage, claimed });
          
          extractedData.variations.push({
            description: description,
            value: Math.abs(value),
            claimed: Math.abs(claimed),
          });
        }
      }
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
    console.error("Error extracting PDF data:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to extract PDF data",
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
