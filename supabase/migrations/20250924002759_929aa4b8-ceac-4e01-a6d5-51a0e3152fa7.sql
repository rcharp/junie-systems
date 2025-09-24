-- Just ensure user_id column exists and has proper foreign key constraint
-- The call_logs table already has user_id, but ensure it has foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_logs_user_id' 
        AND table_name = 'call_logs'
    ) THEN
        ALTER TABLE public.call_logs 
        ADD CONSTRAINT fk_call_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure both user_id and business_id can be used for access
-- Drop and recreate just the main policies we need
DO $$
BEGIN
    -- Drop policies that might conflict
    EXECUTE 'DROP POLICY IF EXISTS "Users can view call logs" ON public.call_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert call logs" ON public.call_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update call logs" ON public.call_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete call logs" ON public.call_logs';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view call logs" ON public.call_logs FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.business_settings bs WHERE bs.id = call_logs.business_id AND bs.user_id = auth.uid()) OR public.has_role(auth.uid(), ''admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Users can insert call logs" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.business_settings bs WHERE bs.id = call_logs.business_id AND bs.user_id = auth.uid()))';
    
    EXECUTE 'CREATE POLICY "Users can update call logs" ON public.call_logs FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.business_settings bs WHERE bs.id = call_logs.business_id AND bs.user_id = auth.uid()))';
    
    EXECUTE 'CREATE POLICY "Users can delete call logs" ON public.call_logs FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.business_settings bs WHERE bs.id = call_logs.business_id AND bs.user_id = auth.uid()) OR public.has_role(auth.uid(), ''admin''::app_role))';
END $$;