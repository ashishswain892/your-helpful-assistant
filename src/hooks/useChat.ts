import { useState, useCallback } from "react";
import { ChatMessage, ApiConfig, Citation, RetrievedChunk } from "@/types/chat";

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
      const res = await fetch(`${config.baseUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          debug: config.debugMode,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();

      const isRefusal = data.answer?.trim() === REFUSAL_TEXT;

      const citations: Citation[] = (data.citations || []).map((c: any) => ({
        document: c.document || c.doc_name || "Unknown",
        page: c.page || c.page_number,
        chunkId: c.chunk_id,
        snippet: c.snippet || c.text || "",
      }));

      const chunks: RetrievedChunk[] = (data.chunks || data.retrieved_chunks || []).map((c: any, i: number) => ({
        id: c.id || c.chunk_id || `chunk-${i}`,
        text: c.text || c.content || "",
        score: c.score || c.similarity || 0,
        document: c.document || c.doc_name || "Unknown",
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
        content: `⚠️ Failed to connect to API at \`${config.baseUrl}\`. Make sure your FastAPI server is running.\n\nError: ${err instanceof Error ? err.message : "Unknown error"}`,
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
