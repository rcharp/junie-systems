-- Clear dummy/test data from call_logs and call_messages tables
-- This will leave the tables empty to show only real webhook data

DELETE FROM public.call_logs;
DELETE FROM public.call_messages;