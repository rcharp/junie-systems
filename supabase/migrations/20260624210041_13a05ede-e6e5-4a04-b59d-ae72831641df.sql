ALTER TABLE public.demo_sessions
  ADD COLUMN IF NOT EXISTS ghl_kb_id text,
  ADD COLUMN IF NOT EXISTS ghl_widget_id text,
  ADD COLUMN IF NOT EXISTS widget_embed text;