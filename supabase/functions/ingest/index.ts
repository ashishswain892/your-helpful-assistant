import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 800, overlap = 200): { text: string; page?: number }[] {
  const chunks: { text: string; page?: number }[] = [];
  
  // Try to split by page markers first
  const pagePattern = /(?:--- ?Page (\d+) ?---|\f|(?:^|\n)Page (\d+)(?:\n|$))/gi;
  const pages: { content: string; pageNum: number }[] = [];
  let lastIndex = 0;
  let currentPage = 1;
  let match;

  while ((match = pagePattern.exec(text)) !== null) {
    const pageContent = text.slice(lastIndex, match.index).trim();
    if (pageContent) {
      pages.push({ content: pageContent, pageNum: currentPage });
    }
    currentPage = parseInt(match[1] || match[2] || String(currentPage + 1));
    lastIndex = match.index + match[0].length;
  }
  
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    pages.push({ content: remaining, pageNum: currentPage });
  }

  if (pages.length === 0) {
    pages.push({ content: text, pageNum: 1 });
  }

  // Chunk each page
  for (const page of pages) {
    const content = page.content;
    if (content.length <= chunkSize) {
      chunks.push({ text: content, page: page.pageNum });
      continue;
    }

    let start = 0;
    while (start < content.length) {
      let end = Math.min(start + chunkSize, content.length);
      
      // Try to break at sentence boundary
      if (end < content.length) {
        const lastPeriod = content.lastIndexOf(".", end);
        const lastNewline = content.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start + chunkSize / 2) {
          end = breakPoint + 1;
        }
      }

      const chunk = content.slice(start, end).trim();
      if (chunk) {
        chunks.push({ text: chunk, page: page.pageNum });
      }
      start = end - overlap;
      if (start >= content.length) break;
    }
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { text, document_name } = body;

    if (!text || !document_name) {
      return new Response(
        JSON.stringify({ error: "Both 'text' and 'document_name' are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({ name: document_name, content: text.substring(0, 500) + "..." })
      .select()
      .single();

    if (docError) throw docError;

    // Chunk the text
    const chunks = chunkText(text);

    // Insert chunks
    const chunkRecords = chunks.map((chunk, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content: chunk.text,
      page_number: chunk.page || null,
    }));

    const { error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    // Update document chunk count
    await supabase
      .from("documents")
      .update({ chunk_count: chunks.length })
      .eq("id", doc.id);

    return new Response(
      JSON.stringify({
        message: "Ingestion complete",
        document_id: doc.id,
        document_name,
        chunks_created: chunks.length,
        documents_count: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
