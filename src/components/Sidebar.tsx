import { useState, useRef } from "react";
import {
  Plane,
  Activity,
  Upload,
  Bug,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  BookOpen,
  File,
} from "lucide-react";
import { ApiConfig, HealthStatus, IngestStatus } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface SidebarProps {
  config: ApiConfig;
  onConfigChange: (config: ApiConfig) => void;
  onClear: () => void;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(`--- Page ${i} ---\n${text}`);
  }
  return pages.join("\n\n");
}

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return extractTextFromPDF(file);
  }
  // For txt, md, and other text files
  return file.text();
}

const Sidebar = ({ config, onConfigChange, onClear }: SidebarProps) => {
  const [health, setHealth] = useState<HealthStatus>({ status: "unknown" });
  const [ingest, setIngest] = useState<IngestStatus>({ status: "idle" });
  const [showIngestForm, setShowIngestForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkHealth = async () => {
    setHealth({ status: "checking" });
    try {
      const { data, error } = await supabase.functions.invoke("health");
      if (error) throw error;
      setHealth({ status: "healthy", details: data.status });
    } catch {
      setHealth({ status: "unhealthy", details: "Cannot reach backend" });
    }
  };

  const triggerIngest = async () => {
    if (!selectedFile) return;
    setIngest({ status: "ingesting", message: "Extracting text from file..." });
    try {
      const text = await extractTextFromFile(selectedFile);
      if (!text.trim()) throw new Error("No text could be extracted from the file");
      setIngest({ status: "ingesting", message: "Uploading to backend..." });
      const docName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const { data, error } = await supabase.functions.invoke("ingest", {
        body: { document_name: docName, text },
      });
      if (error) throw error;
      setIngest({
        status: "done",
        message: `${data.chunks_created} chunks from "${docName}"`,
        documentsCount: data.chunks_created,
      });
      setSelectedFile(null);
      setShowIngestForm(false);
    } catch (e) {
      setIngest({ status: "error", message: e instanceof Error ? e.message : "Error" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
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
          <h1 className="text-sm font-bold tracking-wide text-foreground">AIRMAN RAG</h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Aviation Doc AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Health */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Health</span>
          </div>
          <button
            onClick={checkHealth}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80"
          >
            {healthIcon[health.status]}
            <span>{health.status === "unknown" ? "Check Health" : health.status === "checking" ? "Checking..." : health.status === "healthy" ? "Healthy" : "Unhealthy"}</span>
          </button>
        </section>

        {/* Ingest */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Ingestion</span>
          </div>

          {!showIngestForm ? (
            <button
              onClick={() => setShowIngestForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 glow-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Add Document</span>
            </button>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.text"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/50 px-3 py-4 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <File className="h-4 w-4" />
                <span>{selectedFile ? selectedFile.name : "Choose PDF, TXT, or MD file"}</span>
              </button>
              {selectedFile && (
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={triggerIngest}
                  disabled={ingest.status === "ingesting" || !selectedFile}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {ingest.status === "ingesting" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  <span>{ingest.status === "ingesting" ? "Ingesting..." : "Upload & Ingest"}</span>
                </button>
                <button
                  onClick={() => { setShowIngestForm(false); setSelectedFile(null); }}
                  className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ingest.message && (
            <p className={`mt-1.5 text-[10px] font-mono ${ingest.status === "error" ? "text-destructive" : "text-success"}`}>
              {ingest.message}
            </p>
          )}
        </section>

        {/* Debug Toggle */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bug className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Debug Mode</span>
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
          <p className="mt-1.5 text-[10px] text-muted-foreground">Shows retrieved chunks with scores</p>
        </section>

        {/* Info */}
        <section className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">How to use</span>
          </div>
          <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Check health status</li>
            <li>Add document text via ingestion</li>
            <li>Ask questions about the docs</li>
            <li>Enable debug to see chunks</li>
          </ol>
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
