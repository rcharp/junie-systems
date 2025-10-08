-- Rename appointment_notes to additional_notes in call_logs
ALTER TABLE public.call_logs 
RENAME COLUMN appointment_notes TO additional_notes;

-- Rename appointment_notes to additional_notes in call_messages
ALTER TABLE public.call_messages 
RENAME COLUMN appointment_notes TO additional_notes;

-- Rename appointment_notes to additional_notes in appointments
ALTER TABLE public.appointments 
RENAME COLUMN appointment_notes TO additional_notes;