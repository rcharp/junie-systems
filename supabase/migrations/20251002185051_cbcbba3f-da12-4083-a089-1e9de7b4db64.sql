-- Create a function to allow service role to execute SQL for session settings
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow setting session configuration variables
  IF NOT (sql ~* '^SET\s+app\.settings\.') THEN
    RAISE EXCEPTION 'Only SET app.settings.* commands are allowed';
  END IF;
  
  EXECUTE sql;
END;
$$;

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;