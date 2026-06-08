-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to generate a blog post daily at 9:00 AM UTC
-- The Authorization bearer token is read from a Postgres GUC at runtime so
-- no secret is committed to source control.
--
-- Before scheduling, set the GUC (run once as superuser/service_role):
--   ALTER DATABASE postgres SET app.cron_blog_token = '<service_role_or_anon_jwt>';
--
SELECT cron.schedule(
  'generate-daily-blog-post',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://urkoxlolimjjadbdckco.supabase.co/functions/v1/generate-blog-post',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_blog_token', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- View scheduled cron jobs
-- SELECT * FROM cron.job;

-- To unschedule the job later, use:
-- SELECT cron.unschedule('generate-daily-blog-post');
