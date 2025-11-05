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
  // Remove $ signs, spaces, and convert commas to nothing
  const cleaned = str.replace(/[$\s]/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
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

    // Read file as text
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert bytes to text
    let text = "";
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
        text += String.fromCharCode(byte);
      }
    }

    const extractedData: ExtractedData = {
      contractWorks: [],
      variations: [],
    };

    const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
    
    // Find BASE CONTRACT section
    let inBaseContract = false;
    let inVariations = false;
    let baseContractValue = 0;
    let baseContractClaimed = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect BASE CONTRACT section
      if (line.includes('BASE CONTRACT')) {
        inBaseContract = true;
        inVariations = false;
        continue;
      }
      
      // Detect VARIATIONS section
      if (line.includes('VARIATIONS') || line.match(/^Var No/i)) {
        inBaseContract = false;
        inVariations = true;
        continue;
      }
      
      // Stop at SUMMARY section
      if (line.includes('SUMMARY') || line.includes('TOTAL (A + B')) {
        break;
      }
      
      // Parse BASE CONTRACT lines
      if (inBaseContract && !line.includes('TOTAL BASE CONTRACT')) {
        // Look for pattern: number followed by description, qty, rate, dollar amount, percentage, dollar amount
        // Example: "1.1 1.00 Sum 217,025.00 $ 100.00%"
        const basePattern = /^[\d.]+\s+[\d.]+\s+Sum\s+([\d,]+\.\d{2})\s*\$\s*([\d.]+)%/;
        const match = line.match(basePattern);
        
        if (match) {
          const amount = parseAmount(match[1]);
          const percentage = parseFloat(match[2]);
          const claimed = amount * (percentage / 100);
          
          baseContractValue += amount;
          baseContractClaimed += claimed;
        }
      }
      
      // Parse TOTAL BASE CONTRACT line
      if (line.includes('TOTAL BASE CONTRACT')) {
        const totalsPattern = /\$\s*([\d,]+\.\d{2}).*\$\s*([\d,]+\.\d{2})/;
        const match = line.match(totalsPattern);
        if (match) {
          baseContractValue = parseAmount(match[1]);
          baseContractClaimed = parseAmount(match[2]);
        }
      }
      
      // Parse VARIATION lines
      if (inVariations) {
        // Look for variation number pattern: 2.9, 2.10, 2.16rev2, etc.
        const varPattern = /^([\d.]+(?:rev\d*)?)(.*)/;
        const varMatch = line.match(varPattern);
        
        if (varMatch && varMatch[1].match(/^\d+\.\d+/)) {
          const varNum = varMatch[1];
          const restOfLine = varMatch[2];
          
          // Parse amount and percentage from the line
          // Pattern: "1.00 Sum 18,001.17 $ 100.00%" or "1.00 Under Review $ 100.00% 4,355.23"
          const amountPattern = /([\d,]+\.\d{2})\s*\$\s*([\d.]+)%/g;
          const amounts = [...restOfLine.matchAll(amountPattern)];
          
          if (amounts.length > 0) {
            let value = 0;
            let claimed = 0;
            
            // Handle different formats
            if (restOfLine.includes('Under Review')) {
              // Format: "1.00 Under Review $ 100.00% 4,355.23"
              const reviewPattern = /Under Review.*?([\d,]+\.\d{2})/;
              const reviewMatch = restOfLine.match(reviewPattern);
              if (reviewMatch) {
                value = parseAmount(reviewMatch[1]);
                claimed = value * (parseFloat(amounts[0][2]) / 100);
              }
            } else {
              // Standard format: "1.00 Sum 18,001.17 $ 100.00%"
              value = parseAmount(amounts[0][1]);
              const percentage = parseFloat(amounts[0][2]);
              claimed = value * (percentage / 100);
            }
            
            // Get description from next line(s)
            let description = `Variation ${varNum}`;
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              // If next line doesn't start with a number, it's probably the description
              if (!nextLine.match(/^[\d.]+/) && nextLine.length > 0 && nextLine.length < 200) {
                description = nextLine;
              }
            }
            
            if (value !== 0) {
              extractedData.variations.push({
                description: description.substring(0, 100),
                value: Math.abs(value),
                claimed: Math.abs(claimed),
              });
            }
          }
        }
      }
    }

    // Add contract works
    if (baseContractValue > 0) {
      extractedData.contractWorks.push({
        description: "Base Contract Works",
        value: baseContractValue,
        claimed: baseContractClaimed,
      });
    }

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
