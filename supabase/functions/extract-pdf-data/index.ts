import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Read file as text (basic PDF text extraction)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert bytes to text (this is a simple approach that extracts visible text)
    let text = "";
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // Only include printable ASCII characters and common punctuation
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
        text += String.fromCharCode(byte);
      }
    }

    // Extract numerical data from text
    const extractedData: ExtractedData = {
      contractWorks: [],
      variations: [],
    };

    // Look for common patterns in construction cost documents
    const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
    
    let totalContractValue = 0;
    let totalContractClaimed = 0;
    
    // Pattern matching for dollar amounts
    const dollarPattern = /\$?\s*([\d,]+\.?\d*)/g;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for contract value indicators
      if (line.match(/contract\s+(value|sum|price)/i)) {
        const matches = [...line.matchAll(dollarPattern)];
        if (matches.length > 0) {
          const value = parseFloat(matches[0][1].replace(/,/g, ""));
          if (!isNaN(value) && value > 0) {
            totalContractValue = Math.max(totalContractValue, value);
          }
        }
      }
      
      // Look for claimed amounts
      if (line.match(/claimed|payment|certified/i)) {
        const matches = [...line.matchAll(dollarPattern)];
        if (matches.length > 0) {
          const value = parseFloat(matches[0][1].replace(/,/g, ""));
          if (!isNaN(value) && value > 0) {
            totalContractClaimed = Math.max(totalContractClaimed, value);
          }
        }
      }
      
      // Look for variations
      if (line.match(/variation|v\s*\d+|vo\s*\d+/i)) {
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
        const combinedText = line + " " + nextLine;
        
        const matches = [...combinedText.matchAll(dollarPattern)];
        if (matches.length >= 2) {
          const value = parseFloat(matches[0][1].replace(/,/g, ""));
          const claimed = parseFloat(matches[1][1].replace(/,/g, ""));
          
          if (!isNaN(value) && !isNaN(claimed) && value > 0) {
            extractedData.variations.push({
              description: line.substring(0, 50).trim(),
              value,
              claimed,
            });
          }
        }
      }
    }

    // Add contract works if we found values
    if (totalContractValue > 0) {
      extractedData.contractWorks.push({
        description: "Contract Works",
        value: totalContractValue,
        claimed: totalContractClaimed,
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
      JSON.stringify({ error: error.message || "Failed to extract PDF data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
