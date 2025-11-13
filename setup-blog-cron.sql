-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to generate a blog post daily at 9:00 AM UTC
SELECT cron.schedule(
  'generate-daily-blog-post',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://urkoxlolimjjadbdckco.supabase.co/functions/v1/generate-blog-post',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVya294bG9saW1qamFkYmRja2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTM3MDAsImV4cCI6MjA3MDYyOTcwMH0.1kZKwOYAl7NUlCDCtRxhU7yQqBAYn9-I5g0JHN88yE0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- View scheduled cron jobs
-- SELECT * FROM cron.job;

-- To unschedule the job later, use:
-- SELECT cron.unschedule('generate-daily-blog-post');
