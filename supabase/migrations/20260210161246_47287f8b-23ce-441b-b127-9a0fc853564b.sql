
-- Enable full text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document chunks for RAG retrieval
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for full-text search
CREATE INDEX idx_chunks_search ON public.document_chunks USING GIN(search_vector);
CREATE INDEX idx_chunks_document ON public.document_chunks(document_id);
CREATE INDEX idx_chunks_trgm ON public.document_chunks USING GIN(content gin_trgm_ops);

-- RLS - public read access (aviation docs are public reference material)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are publicly readable" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Documents can be inserted by anyone" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Chunks are publicly readable" ON public.document_chunks FOR SELECT USING (true);
CREATE POLICY "Chunks can be inserted by anyone" ON public.document_chunks FOR INSERT WITH CHECK (true);
