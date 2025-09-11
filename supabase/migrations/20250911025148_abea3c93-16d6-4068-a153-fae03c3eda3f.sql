-- Create table to store Google Calendar integration settings
CREATE TABLE public.google_calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  refresh_token TEXT,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  appointment_duration INTEGER DEFAULT 60, -- minutes
  availability_hours JSONB DEFAULT '{"monday":{"start":"09:00","end":"17:00","enabled":true},"tuesday":{"start":"09:00","end":"17:00","enabled":true},"wednesday":{"start":"09:00","end":"17:00","enabled":true},"thursday":{"start":"09:00","end":"17:00","enabled":true},"friday":{"start":"09:00","end":"17:00","enabled":true},"saturday":{"start":"09:00","end":"17:00","enabled":false},"sunday":{"start":"09:00","end":"17:00","enabled":false}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calendar settings" 
ON public.google_calendar_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar settings" 
ON public.google_calendar_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar settings" 
ON public.google_calendar_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar settings" 
ON public.google_calendar_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_calendar_settings_updated_at
BEFORE UPDATE ON public.google_calendar_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add calendar_event_id to appointments table to track Google Calendar events
ALTER TABLE public.appointments 
ADD COLUMN calendar_event_id TEXT;