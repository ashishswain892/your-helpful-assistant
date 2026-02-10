import { Database } from "lucide-react";
import { RetrievedChunk } from "@/types/chat";

interface ChunkPanelProps {
  chunks: RetrievedChunk[];
}

const ChunkPanel = ({ chunks }: ChunkPanelProps) => {
  if (!chunks.length) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50">
        <Database className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-mono font-medium text-accent">
          Retrieved Chunks ({chunks.length})
        </span>
      </div>
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {chunks.map((chunk, i) => (
          <div key={chunk.id} className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                {chunk.document} {chunk.page ? `· p.${chunk.page}` : ""} · {chunk.id}
              </span>
              <span className="text-xs font-mono text-accent">
                score: {chunk.score.toFixed(4)}
              </span>
            </div>
            <p className="text-xs text-secondary-foreground leading-relaxed line-clamp-3">
              {chunk.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChunkPanel;
