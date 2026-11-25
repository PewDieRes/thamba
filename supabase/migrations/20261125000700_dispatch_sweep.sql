create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- The request queue contains the decrypted header until pg_net sends it.
revoke all on table net.http_request_queue, net._http_response
  from public, anon, authenticated, service_role;

create function thamba_private.enqueue_dispatch_sweep()
returns bigint
language sql
set search_path = ''
as $$
  select net.http_post(
    url := rtrim(origin.decrypted_secret, '/') || '/api/internal/dispatch/sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'Authorization', 'Bearer ' || token.decrypted_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  from vault.decrypted_secrets as origin
  cross join vault.decrypted_secrets as token
  where origin.name = 'dispatch_sweep_app_url' and token.name = 'dispatch_sweep_token'
    and origin.decrypted_secret ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?/?$'
    and btrim(token.decrypted_secret) <> ''
    and not exists (
      select from pg_roles
      where rolname in ('thamba_reader', 'thamba_writer', 'thamba_sweep')
        and has_schema_privilege(oid, 'net', 'USAGE')
        and has_column_privilege(oid, 'net.http_request_queue', 'headers', 'SELECT')
    );
$$;

revoke all on function thamba_private.enqueue_dispatch_sweep()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'thamba-dispatch-sweep',
  '* * * * *',
  'select thamba_private.enqueue_dispatch_sweep();'
);
