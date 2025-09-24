-- Fix remaining database function security issues - add search_path to all functions

-- Update remaining functions with secure search_path parameter
CREATE OR REPLACE FUNCTION public.audit_appointments_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Log access to sensitive customer data
    INSERT INTO public.user_activity (
        user_id,
        activity_type,
        activity_data
    ) VALUES (
        auth.uid(),
        'appointments_access',
        jsonb_build_object(
            'appointment_id', COALESCE(NEW.id, OLD.id),
            'operation', TG_OP,
            'timestamp', now()
        )
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.authorize_admin_customer_data_access(justification text, target_appointment_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Only admins can authorize themselves
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only admins can authorize customer data access';
    END IF;
    
    -- Log the authorization with justification
    INSERT INTO public.user_activity (
        user_id,
        activity_type,
        activity_data
    ) VALUES (
        auth.uid(),
        'admin_customer_data_access_authorized',
        jsonb_build_object(
            'justification', justification,
            'target_appointment_id', target_appointment_id,
            'authorized_at', now()
        )
    );
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  actual_encrypted_data text;
  json_data jsonb;
  clean_data text;
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if the encrypted_token is in JSON format (from the old storage)
  BEGIN
    json_data := encrypted_token::jsonb;
    -- If it's JSON, extract the data field
    actual_encrypted_data := json_data->>'data';
  EXCEPTION
    WHEN OTHERS THEN
      -- If it's not JSON, use it directly
      actual_encrypted_data := encrypted_token;
  END;
  
  IF actual_encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove newlines and spaces from base64 data
  clean_data := replace(replace(actual_encrypted_data, E'\n', ''), ' ', '');
  
  RETURN pgp_sym_decrypt(decode(clean_data, 'base64'), 'secure_encryption_key_2024');
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return null
    RAISE NOTICE 'Decryption failed: %', SQLERRM;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Use a fixed encryption key for this demo - in production, use environment variable
  RETURN encode(pgp_sym_encrypt(token, 'secure_encryption_key_2024'), 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails, return null to prevent storing plain text
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_appointments_summary(target_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, service_type text, preferred_date date, preferred_time time without time zone, status text, created_at timestamp with time zone, caller_name_masked text, contact_masked text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Only return full data if user owns the appointments or is properly authorized admin
    IF target_user_id IS NOT NULL AND target_user_id = auth.uid() THEN
        -- Business owner can see their own appointment details
        RETURN QUERY
        SELECT 
            a.id,
            a.service_type,
            a.preferred_date,
            a.preferred_time,
            a.status,
            a.created_at,
            a.caller_name,
            COALESCE(a.email, a.phone_number) as contact_info
        FROM public.appointments a
        WHERE a.user_id = target_user_id;
    ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
        -- Admins see masked data unless specifically authorized
        RETURN QUERY
        SELECT 
            a.id,
            a.service_type,
            a.preferred_date,
            a.preferred_time,
            a.status,
            a.created_at,
            left(a.caller_name, 1) || '***' as caller_name_masked,
            '***@***.***' as contact_masked
        FROM public.appointments a
        WHERE (target_user_id IS NULL OR a.user_id = target_user_id);
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_google_calendar_tokens(p_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, is_connected boolean, calendar_id text, timezone text, appointment_duration integer, availability_hours jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, access_token text, refresh_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only allow users to access their own tokens or service role
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: can only access own tokens';
  END IF;

  RETURN QUERY
  SELECT 
    gcs.id,
    gcs.user_id,
    gcs.is_connected,
    gcs.calendar_id,
    gcs.timezone,
    gcs.appointment_duration,
    gcs.availability_hours,
    gcs.created_at,
    gcs.updated_at,
    gcs.expires_at,
    public.decrypt_token(gcs.encrypted_access_token),
    public.decrypt_token(gcs.encrypted_refresh_token)
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_tiktok_tokens(account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result jsonb;
  account_user_id uuid;
BEGIN
  -- Verify the user owns this account
  SELECT user_id INTO account_user_id
  FROM public.tiktok_accounts
  WHERE id = account_id;
  
  IF account_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not account owner';
  END IF;
  
  -- In production, this would retrieve from Supabase Vault
  -- For now, return empty tokens as the actual implementation
  -- would require Supabase Vault integration
  result := jsonb_build_object(
    'access_token', null,
    'refresh_token', null,
    'note', 'Tokens stored securely in vault'
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT id
  FROM auth.users
  WHERE email = _email
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_users_with_business_ids_for_admin()
RETURNS TABLE(id uuid, email text, business_id uuid, full_name text, company_name text, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Only allow admin users to access this function
  SELECT 
    up.id,
    au.email,
    bs.id as business_id,
    up.full_name,
    up.company_name,
    up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN public.business_settings bs ON up.id = bs.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY up.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_users_with_emails_for_admin()
RETURNS TABLE(id uuid, email text, webhook_id uuid, full_name text, company_name text, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Only allow admin users to access this function
  SELECT 
    up.id,
    au.email,
    up.webhook_id,
    up.full_name,
    up.company_name,
    up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY up.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_data jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_activity (
    user_id,
    activity_type,
    activity_data,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    event_type,
    event_data,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.store_tiktok_tokens(account_id uuid, access_token text, refresh_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  vault_key text;
BEGIN
  -- Generate a unique vault key for this account
  vault_key := 'tiktok_tokens_' || account_id::text;
  
  -- Store tokens in vault (this would use Supabase Vault API in production)
  -- For now, we'll use a secure approach with pgsodium if available
  -- In a real implementation, this would integrate with Supabase Vault
  
  -- Update the account with the vault key reference
  UPDATE public.tiktok_accounts 
  SET vault_key_id = vault_key
  WHERE id = account_id AND user_id = auth.uid();
  
  RETURN vault_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_google_calendar_tokens(p_user_id uuid, p_access_token text DEFAULT NULL::text, p_refresh_token text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.google_calendar_settings 
  SET 
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN public.encrypt_token(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN public.encrypt_token(p_refresh_token)
      ELSE encrypted_refresh_token 
    END,
    expires_at = COALESCE(p_expires_at, expires_at),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tiktok_tokens(account_id uuid, new_access_token text DEFAULT NULL::text, new_refresh_token text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  account_user_id uuid;
BEGIN
  -- Verify the user owns this account
  SELECT user_id INTO account_user_id
  FROM public.tiktok_accounts
  WHERE id = account_id;
  
  IF account_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: not account owner';
  END IF;
  
  -- In production, this would update tokens in Supabase Vault
  -- For now, we just ensure the vault_key_id is set
  UPDATE public.tiktok_accounts 
  SET vault_key_id = COALESCE(vault_key_id, 'tiktok_tokens_' || account_id::text),
      updated_at = now()
  WHERE id = account_id;
  
  RETURN true;
END;
$function$;