-- Add admin access policies for appointments table
-- This allows legitimate admin oversight while maintaining security

-- Allow admins to view all appointments for administrative purposes
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update appointment status for administrative purposes  
CREATE POLICY "Admins can update appointment status" 
ON public.appointments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add similar admin policies for call_logs table for consistency
CREATE POLICY "Admins can view all call logs" 
ON public.call_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy for call_messages table
CREATE POLICY "Admins can view all call messages" 
ON public.call_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));