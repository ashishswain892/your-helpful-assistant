import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REFUSAL = "This information is not available in the provided document(s).";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, debug } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build search query - convert question to tsquery
    const searchTerms = question
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .slice(0, 10)
      .join(" | ");

    // Full-text search
    const { data: ftsResults } = await supabase
      .from("document_chunks")
      .select("id, content, page_number, chunk_index, document_id")
      .textSearch("search_vector", searchTerms, { type: "plain" })
      .limit(10);

    // Trigram similarity fallback
    const { data: trigramResults } = await supabase
      .from("document_chunks")
      .select("id, content, page_number, chunk_index, document_id")
      .ilike("content", `%${question.split(/\s+/).slice(0, 3).join("%")}%`)
      .limit(5);

    // Merge and deduplicate results
    const seen = new Set<string>();
    const allResults: any[] = [];

    for (const r of [...(ftsResults || []), ...(trigramResults || [])]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        allResults.push(r);
      }
    }

    // Get document names
    const docIds = [...new Set(allResults.map(r => r.document_id))];
    const { data: docs } = docIds.length > 0
      ? await supabase.from("documents").select("id, name").in("id", docIds)
      : { data: [] };

    const docMap = new Map((docs || []).map(d => [d.id, d.name]));

    // Take top 5 chunks
    const topChunks = allResults.slice(0, 5).map((r, i) => ({
      id: `chunk-${r.chunk_index}`,
      text: r.content,
      score: 1 - i * 0.1, // approximate ranking
      document: docMap.get(r.document_id) || "Unknown",
      page_number: r.page_number,
    }));

    // If no chunks found, refuse
    if (topChunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: REFUSAL,
          citations: [],
          chunks: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for LLM
    const context = topChunks
      .map((c, i) => `[Source ${i + 1} - ${c.document}, Page ${c.page_number || "N/A"}]\n${c.text}`)
      .join("\n\n---\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an aviation document assistant for AIRMAN. You answer questions STRICTLY and ONLY based on the provided context from aviation documents (PPL/CPL/ATPL textbooks, SOPs, manuals).

CRITICAL RULES:
1. ONLY use information from the provided context to answer questions.
2. If the answer cannot be fully supported by the provided context, respond EXACTLY with: "${REFUSAL}"
3. Do NOT add any information from your general knowledge.
4. Always cite which source(s) you used in your answer (e.g., "[Source 1]").
5. Be precise and factual. Aviation safety depends on accuracy.
6. For procedural questions, list steps clearly.
7. If partially supported, only state what the documents confirm and note what's missing.`,
          },
          {
            role: "user",
            content: `Context from aviation documents:\n\n${context}\n\n---\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || REFUSAL;
    const isRefusal = answer.trim() === REFUSAL;

    // Build citations from chunks referenced in answer
    const citations = topChunks.slice(0, 3).map(c => ({
      document: c.document,
      page: c.page_number,
      chunk_id: c.id,
      snippet: c.text.substring(0, 150) + "...",
    }));

    return new Response(
      JSON.stringify({
        answer,
        citations: isRefusal ? [] : citations,
        chunks: debug ? topChunks : [],
        retrieved_chunks: debug ? topChunks : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ask error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
