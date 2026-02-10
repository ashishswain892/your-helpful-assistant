export interface Citation {
  document: string;
  page?: number;
  chunkId?: string;
  snippet: string;
}

export interface RetrievedChunk {
  id: string;
  text: string;
  score: number;
  document: string;
  page?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  chunks?: RetrievedChunk[];
  isRefusal?: boolean;
  timestamp: Date;
}

export interface ApiConfig {
  baseUrl: string;
  debugMode: boolean;
}

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "checking" | "unknown";
  details?: string;
}

export interface IngestStatus {
  status: "idle" | "ingesting" | "done" | "error";
  message?: string;
  documentsCount?: number;
}
