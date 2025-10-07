-- Grant full access to admins on all tables

-- appointments
CREATE POLICY "Admins have full access to appointments"
ON public.appointments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- business_settings
CREATE POLICY "Admins have full access to business_settings"
ON public.business_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- call_messages
CREATE POLICY "Admins have full access to call_messages"
ON public.call_messages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- client_tool_events
CREATE POLICY "Admins have full access to client_tool_events"
ON public.client_tool_events
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- conversation_call_mapping
CREATE POLICY "Admins have full access to conversation_call_mapping"
ON public.conversation_call_mapping
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- google_calendar_settings
CREATE POLICY "Admins have full access to google_calendar_settings"
ON public.google_calendar_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- rate_limit_logs (already has admin view policy, adding full access)
CREATE POLICY "Admins have full access to rate_limit_logs"
ON public.rate_limit_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- services
CREATE POLICY "Admins have full access to services"
ON public.services
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- todos
CREATE POLICY "Admins have full access to todos"
ON public.todos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_activity
CREATE POLICY "Admins have full access to user_activity"
ON public.user_activity
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_profiles (already has view policy, adding full access)
CREATE POLICY "Admins have full access to user_profiles"
ON public.user_profiles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));