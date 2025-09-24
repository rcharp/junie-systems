-- Add setup_completed field to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN setup_completed boolean DEFAULT false;