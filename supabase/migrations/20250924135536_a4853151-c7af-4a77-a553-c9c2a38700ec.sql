-- Add timezone columns to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN business_timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN business_timezone_offset TEXT DEFAULT '-04:00';

-- Add comment for clarity
COMMENT ON COLUMN public.business_settings.business_timezone IS 'Business timezone in IANA format (e.g., America/New_York)';
COMMENT ON COLUMN public.business_settings.business_timezone_offset IS 'Business timezone offset (e.g., -04:00, +05:30)';

-- Update existing records to have default timezone
UPDATE public.business_settings 
SET 
  business_timezone = 'America/New_York',
  business_timezone_offset = '-04:00'
WHERE business_timezone IS NULL OR business_timezone_offset IS NULL;