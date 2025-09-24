-- Add timezone field to user_profiles table for general timezone handling
ALTER TABLE public.user_profiles 
ADD COLUMN timezone text DEFAULT 'America/New_York';

-- Update existing users to have a default timezone
-- This can be updated by users later in their profile settings
UPDATE public.user_profiles 
SET timezone = 'America/New_York' 
WHERE timezone IS NULL;