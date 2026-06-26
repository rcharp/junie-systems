CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL,
  url text,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_chunks_contact_idx ON public.kb_chunks (contact_id);
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON public.kb_chunks USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.kb_chunks TO anon, authenticated;
GRANT ALL ON public.kb_chunks TO service_role;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_chunks_public_read" ON public.kb_chunks FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(1536),
  match_contact_id text,
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, content text, url text, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT k.id, k.content, k.url, 1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks k
  WHERE k.contact_id = match_contact_id
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_kb_chunks(vector, text, int) TO anon, authenticated, service_role;