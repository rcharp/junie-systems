CREATE TABLE public.demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id text UNIQUE NOT NULL,
  ghl_agent_id text NOT NULL,
  ghl_location_id text NOT NULL,
  prospect_url text,
  business_name text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_sessions TO service_role;

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — table is service-role only (edge functions).

CREATE INDEX idx_demo_sessions_contact ON public.demo_sessions(ghl_contact_id);

CREATE TRIGGER update_demo_sessions_updated_at
BEFORE UPDATE ON public.demo_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();