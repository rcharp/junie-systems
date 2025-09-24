-- Update call_logs records where appointment_date_time is incorrectly set to the call time
-- This will fix existing records to use the correct appointment datetime from the metadata

UPDATE call_logs 
SET appointment_date_time = CASE 
  WHEN appointment_scheduled = true 
   AND metadata->>'appointment_details' IS NOT NULL
   AND appointment_date_time IS NOT NULL
   AND ABS(EXTRACT(EPOCH FROM (appointment_date_time - created_at))) < 300 -- Within 5 minutes of call time, likely incorrect
  THEN 
    -- Parse "Thursday, September twenty-fifth, at three in the afternoon" to proper datetime
    CASE 
      WHEN metadata->>'appointment_details' ILIKE '%thursday%' AND metadata->>'appointment_details' ILIKE '%september%' AND metadata->>'appointment_details' ILIKE '%twenty-fifth%' 
      THEN '2025-09-25 15:00:00'::timestamp with time zone
      ELSE appointment_date_time
    END
  ELSE appointment_date_time
END
WHERE appointment_scheduled = true 
  AND metadata->>'appointment_details' IS NOT NULL;