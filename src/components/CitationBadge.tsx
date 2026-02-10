import { FileText } from "lucide-react";
import { Citation } from "@/types/chat";

interface CitationBadgeProps {
  citation: Citation;
  index: number;
}

const CitationBadge = ({ citation, index }: CitationBadgeProps) => {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-citation/30 bg-citation/10 px-2 py-1 text-xs text-citation">
      <FileText className="h-3 w-3" />
      <span className="font-mono font-medium">[{index + 1}]</span>
      <span className="truncate max-w-[180px]">{citation.document}</span>
      {citation.page && (
        <span className="text-citation/70">p.{citation.page}</span>
      )}
    </div>
  );
};

export default CitationBadge;
