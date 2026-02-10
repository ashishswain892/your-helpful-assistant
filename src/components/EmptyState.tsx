import { Plane, BookOpen, ShieldCheck, Search } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Grounded Answers",
    desc: "Every answer is backed by source documents",
  },
  {
    icon: ShieldCheck,
    title: "Hallucination Control",
    desc: "Refuses to answer if unsupported by docs",
  },
  {
    icon: Search,
    title: "Citations & Debug",
    desc: "See exact sources and retrieved chunks",
  },
];

const EmptyState = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 aviation-grid">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-primary mb-6">
        <Plane className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Aviation Document AI Chat
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
        Ask questions about PPL/CPL/ATPL textbooks, SOPs, and manuals.
        Answers are strictly grounded in the provided documents.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center rounded-lg border border-border bg-card p-4 text-center"
          >
            <f.icon className="h-5 w-5 text-accent mb-2" />
            <span className="text-xs font-semibold text-foreground mb-1">
              {f.title}
            </span>
            <span className="text-[10px] text-muted-foreground leading-snug">
              {f.desc}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Connect your FastAPI backend to begin
        </span>
      </div>
    </div>
  );
};

export default EmptyState;
