-- Drop the existing constraint
ALTER TABLE public.call_logs DROP CONSTRAINT call_logs_call_type_check;

-- Add updated constraint with all supported call types
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_call_type_check 
CHECK (call_type = ANY (ARRAY[
  'inquiry'::text, 
  'appointment'::text, 
  'complaint'::text, 
  'support'::text, 
  'sales'::text, 
  'emergency'::text,
  'consultation'::text,
  'quote'::text,
  'quote_request'::text,
  'other'::text
]));