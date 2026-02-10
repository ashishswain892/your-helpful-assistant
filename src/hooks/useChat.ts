import { useState, useCallback } from "react";
import { ChatMessage, ApiConfig, Citation, RetrievedChunk } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";

const REFUSAL_TEXT = "This information is not available in the provided document(s).";

export function useChat(config: ApiConfig) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ask", {
        body: { question: input, debug: config.debugMode },
      });

      if (error) throw error;

      const isRefusal = data.answer?.trim() === REFUSAL_TEXT;

      const citations: Citation[] = (data.citations || []).map((c: any) => ({
        document: c.document || "Unknown",
        page: c.page || c.page_number,
        chunkId: c.chunk_id,
        snippet: c.snippet || c.text || "",
      }));

      const chunks: RetrievedChunk[] = (data.chunks || data.retrieved_chunks || []).map((c: any, i: number) => ({
        id: c.id || `chunk-${i}`,
        text: c.text || c.content || "",
        score: c.score || 0,
        document: c.document || "Unknown",
        page: c.page || c.page_number,
      }));

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer || "No response received.",
        citations,
        chunks: config.debugMode ? chunks : undefined,
        isRefusal,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
