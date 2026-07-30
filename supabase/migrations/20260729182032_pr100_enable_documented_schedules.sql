begin;

-- Supabase Cron runs inside the existing Postgres project. These jobs call
-- private database functions only and require no endpoint or shared secret.
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in (
    'pr99-private-daily-backup',
    'pr100-private-weekly-backup',
    'pr100-monthly-backup-dry-run',
    'pr100-security-guard-retention'
  );

  perform cron.schedule(
    'pr100-private-weekly-backup',
    '17 2 * * 0',
    'select public.pr99_scheduled_private_backup();'
  );
  perform cron.schedule(
    'pr100-monthly-backup-dry-run',
    '37 3 1 * *',
    'select public.pr100_monthly_backup_dry_run();'
  );
  perform cron.schedule(
    'pr100-security-guard-retention',
    '47 3 * * *',
    'select public.pr100_cleanup_security_guards();'
  );
end;
$$;

commit;
