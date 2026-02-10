import { useState } from "react";
import {
  Plane,
  Activity,
  Upload,
  Settings,
  Bug,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { ApiConfig, HealthStatus, IngestStatus } from "@/types/chat";

interface SidebarProps {
  config: ApiConfig;
  onConfigChange: (config: ApiConfig) => void;
  onClear: () => void;
}

const Sidebar = ({ config, onConfigChange, onClear }: SidebarProps) => {
  const [health, setHealth] = useState<HealthStatus>({ status: "unknown" });
  const [ingest, setIngest] = useState<IngestStatus>({ status: "idle" });

  const checkHealth = async () => {
    setHealth({ status: "checking" });
    try {
      const res = await fetch(`${config.baseUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth({ status: "healthy", details: JSON.stringify(data) });
      } else {
        setHealth({ status: "unhealthy", details: `Status ${res.status}` });
      }
    } catch {
      setHealth({ status: "unhealthy", details: "Cannot reach server" });
    }
  };

  const triggerIngest = async () => {
    setIngest({ status: "ingesting", message: "Sending ingest request..." });
    try {
      const res = await fetch(`${config.baseUrl}/ingest`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIngest({
          status: "done",
          message: data.message || "Ingestion complete",
          documentsCount: data.documents_count,
        });
      } else {
        setIngest({ status: "error", message: `Error: ${res.status}` });
      }
    } catch {
      setIngest({ status: "error", message: "Cannot reach server" });
    }
  };

  const healthIcon = {
    healthy: <CheckCircle2 className="h-4 w-4 text-success" />,
    unhealthy: <XCircle className="h-4 w-4 text-destructive" />,
    checking: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    unknown: <Activity className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 glow-primary">
          <Plane className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide text-foreground">
            AIRMAN RAG
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Aviation Doc AI
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* API Config */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              API Config
            </span>
          </div>
          <label className="block mb-1.5 text-xs text-muted-foreground">Base URL</label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => onConfigChange({ ...config, baseUrl: e.target.value })}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        {/* Health */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Health
            </span>
          </div>
          <button
            onClick={checkHealth}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80"
          >
            {healthIcon[health.status]}
            <span>
              {health.status === "unknown"
                ? "Check Health"
                : health.status === "checking"
                ? "Checking..."
                : health.status === "healthy"
                ? "Healthy"
                : "Unhealthy"}
            </span>
          </button>
          {health.details && (
            <p className="mt-1.5 text-[10px] font-mono text-muted-foreground truncate">
              {health.details}
            </p>
          )}
        </section>

        {/* Ingest */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Ingestion
            </span>
          </div>
          <button
            onClick={triggerIngest}
            disabled={ingest.status === "ingesting"}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 glow-primary"
          >
            {ingest.status === "ingesting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            <span>
              {ingest.status === "ingesting" ? "Ingesting..." : "Trigger Ingest"}
            </span>
          </button>
          {ingest.message && (
            <p
              className={`mt-1.5 text-[10px] font-mono ${
                ingest.status === "error" ? "text-destructive" : "text-success"
              }`}
            >
              {ingest.message}
              {ingest.documentsCount != null && ` (${ingest.documentsCount} docs)`}
            </p>
          )}
        </section>

        {/* Debug Toggle */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bug className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Debug Mode
            </span>
          </div>
          <button
            onClick={() => onConfigChange({ ...config, debugMode: !config.debugMode })}
            className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition ${
              config.debugMode
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-secondary text-secondary-foreground"
            }`}
          >
            <Bug className="h-3.5 w-3.5" />
            <span>{config.debugMode ? "Debug ON" : "Debug OFF"}</span>
          </button>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Shows retrieved chunks with similarity scores
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={onClear}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-destructive hover:border-destructive/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
