-- Fix the appointment_date_time to account for EDT timezone (GMT-4)
-- The appointment was scheduled for 3pm local time (EDT), which should be 19:00 UTC (3pm + 4 hours)
UPDATE call_logs 
SET appointment_date_time = appointment_date_time + INTERVAL '4 hours'
WHERE id = '390f2a22-62bd-4b9a-8257-94387011dc5f'
  AND appointment_date_time = '2025-09-25 15:00:00+00';