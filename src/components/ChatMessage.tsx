import { Bot, User, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage as ChatMessageType } from "@/types/chat";
import CitationBadge from "./CitationBadge";
import ChunkPanel from "./ChunkPanel";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser
            ? "bg-primary/20 text-primary"
            : message.isRefusal
            ? "bg-warning/20 text-warning"
            : "bg-accent/20 text-accent"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : message.isRefusal ? <ShieldAlert className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`flex-1 max-w-2xl ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-lg px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary/15 text-foreground"
              : message.isRefusal
              ? "bg-warning/10 border border-warning/20 text-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.citations.map((cit, i) => (
              <CitationBadge key={i} citation={cit} index={i} />
            ))}
          </div>
        )}

        {message.chunks && message.chunks.length > 0 && (
          <ChunkPanel chunks={message.chunks} />
        )}

        <div className="mt-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
