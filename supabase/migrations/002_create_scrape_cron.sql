-- pg_cron + pg_net으로 Edge Function을 주기적으로 호출
-- 아래 YOUR_PROJECT_REF, YOUR_SERVICE_ROLE_KEY를 실제 값으로 교체 후 실행

SELECT cron.schedule(
  'scrape-zighang-jobs',       -- job 이름
  '0 3 * * *',                 -- 매일 새벽 3시 (UTC)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-jobs',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
