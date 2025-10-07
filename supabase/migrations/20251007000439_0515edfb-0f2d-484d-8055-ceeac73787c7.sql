-- Create rate_limit_logs table for tracking password reset and other rate-limited actions
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  action_type TEXT NOT NULL, -- 'password_reset', 'login_attempt', etc.
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limit_logs_identifier_action ON public.rate_limit_logs(identifier, action_type, created_at DESC);
CREATE INDEX idx_rate_limit_logs_ip_action ON public.rate_limit_logs(ip_address, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limit logs
CREATE POLICY "Service role can manage rate limit logs"
ON public.rate_limit_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Admins can view rate limit logs
CREATE POLICY "Admins can view rate limit logs"
ON public.rate_limit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to clean up old rate limit logs (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE created_at < now() - interval '24 hours';
END;
$$;

COMMENT ON TABLE public.rate_limit_logs IS 'Tracks rate-limited actions like password resets to prevent abuse';
COMMENT ON FUNCTION public.cleanup_old_rate_limit_logs() IS 'Cleans up rate limit logs older than 24 hours';