-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily test suite run at 2 AM UTC
SELECT cron.schedule(
  'daily-test-suite-run',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://urkoxlolimjjadbdckco.supabase.co/functions/v1/run-test-suite',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVya294bG9saW1qamFkYmRja2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTM3MDAsImV4cCI6MjA3MDYyOTcwMH0.1kZKwOYAl7NUlCDCtRxhU7yQqBAYn9-I5g0JHN88yE0"}'::jsonb,
        body:=concat('{"scheduled_run": true, "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
