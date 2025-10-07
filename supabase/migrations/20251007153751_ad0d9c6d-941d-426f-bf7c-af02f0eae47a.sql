-- Remove check constraint that blocks plain text tokens
ALTER TABLE public.google_calendar_settings 
DROP CONSTRAINT IF EXISTS check_no_plain_text_tokens;