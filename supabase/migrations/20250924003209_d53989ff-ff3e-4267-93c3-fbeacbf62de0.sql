-- CRITICAL SECURITY FIXES - Remove dangerous public access policies

-- 1. FIX CALL LOGS - Remove dangerous service role policy that exposes all customer data
DROP POLICY IF EXISTS "Service role can manage call logs" ON public.call_logs;

-- 2. FIX TODOS TABLE - Add user_id and secure it properly
-- First add user_id column to todos table
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set existing todos to a default admin user (or they can be cleaned up)
UPDATE public.todos SET user_id = (
  SELECT user_id FROM public.user_roles 
  WHERE role = 'admin'::app_role 
  LIMIT 1
) WHERE user_id IS NULL;

-- Drop all dangerous public access policies on todos
DROP POLICY IF EXISTS "Anyone can create todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can delete todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can update todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can view todos" ON public.todos;

-- Create secure user-specific policies for todos
CREATE POLICY "Users can view their own todos" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own todos" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- 3. SECURE DATABASE FUNCTIONS - Add proper search_path to prevent SQL injection
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 4. ADD COMPREHENSIVE AUDIT LOGGING FOR SENSITIVE DATA ACCESS
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    sensitive_data_accessed BOOLEAN DEFAULT FALSE,
    justification TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view security audit logs" ON public.security_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

-- 5. CREATE TRIGGER FOR CALL LOGS ACCESS AUDITING (INSERT/UPDATE/DELETE only)
CREATE OR REPLACE FUNCTION public.audit_call_logs_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any access to call logs containing customer data
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        table_name,
        record_id,
        sensitive_data_accessed,
        ip_address
    ) VALUES (
        auth.uid(),
        TG_OP,
        'call_logs',
        COALESCE(NEW.id, OLD.id),
        true,
        inet_client_addr()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for call logs auditing (no SELECT trigger)
DROP TRIGGER IF EXISTS audit_call_logs_trigger ON public.call_logs;
CREATE TRIGGER audit_call_logs_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.call_logs
    FOR EACH ROW EXECUTE FUNCTION public.audit_call_logs_access();

-- 6. UPDATE OTHER FUNCTIONS WITH SECURE SEARCH PATH
CREATE OR REPLACE FUNCTION public.get_user_id_by_webhook_id(_webhook_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT id
  FROM public.user_profiles
  WHERE webhook_id = _webhook_id
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;