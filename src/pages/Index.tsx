import { useState, useRef, useEffect } from "react";
import { ApiConfig } from "@/types/chat";
import { useChat } from "@/hooks/useChat";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import EmptyState from "@/components/EmptyState";

const Index = () => {
  const [config, setConfig] = useState<ApiConfig>({
    baseUrl: "http://localhost:8000",
    debugMode: false,
  });

  const { messages, isLoading, sendMessage, clearMessages } = useChat(config);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar config={config} onConfigChange={setConfig} onClear={clearMessages} />

      <main className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">Chat</h2>
            {config.debugMode && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-mono font-medium text-accent">
                DEBUG
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {messages.length} messages
          </span>
        </header>

        {/* Messages */}
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scanline">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                  <div className="rounded-lg bg-secondary px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
};

export default Index;
