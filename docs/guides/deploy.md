# Vercel previews

1. Import the Thamba repository into Vercel and select the Next.js preset with the repository root as the Root Directory.
2. Select Node.js 24.x. Set the Preview environment variable `ENABLE_EXPERIMENTAL_COREPACK` to `1` so Vercel uses the pnpm version pinned in `package.json`. Set the Install Command to `pnpm install --frozen-lockfile` and the Build Command to `pnpm build`. The repository sets the function region to Mumbai (`bom1`).
3. Open a pull request to generate a Preview deployment. Open its URL and confirm that `/` redirects to `/mr` and renders **थांबा**. Check `/en` and `/hi` for the corresponding document languages.

The application builds without credentials. When Supabase wiring lands, use an isolated Mumbai (`ap-south-1`) project with synthetic data. Add the preview project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under **Settings → Environment Variables → Preview**. Store database URLs, dispatch tokens and private push credentials in Preview-scoped server environment variables. Keep credentials in the hosting dashboard and use a separate Supabase project for production.

[Vercel build configuration](https://vercel.com/docs/builds/configure-a-build#corepack) · [Vercel deployment environments](https://vercel.com/docs/deployments/environments) · [Vercel regions](https://vercel.com/docs/regions) · [Thamba architecture](../02-plan/architecture.md)

## Database roles and transaction scope

Apply the migrations using deployment credentials. Provision separate server logins that inherit
`thamba_reader`, `thamba_writer` and `thamba_sweep` respectively, then store their transaction-pooler
URLs in `DATABASE_READER_URL`, `DATABASE_WRITER_URL` and `DATABASE_SWEEP_URL`. Use TLS and disable
prepared statements in transaction mode. Keep the migration owner and service-role credentials out
of the request path. The service role provisions Town configuration and Coordinator membership.

Within a transaction, use parameterized `set_config(name, value, true)` to set the verified Town UUID
in `thamba.town_id`, the demo run UUID or `live` in `thamba.demo_run_id`, and the authorized Stand UUIDs
as a comma-separated list in `thamba.stand_ids`. For actor reads, set `thamba.actor_kind` to `rider`,
`driver` or `coordinator` and set `request.jwt.claims` from verified Auth, including `sub` and
`is_anonymous`. For idempotent commands, set `thamba.command_actor` and `thamba.command_key` from the
validated command. Set `thamba.actor_subject` from the verified Driver session when redeeming an
invite so the command can check the session's prior binding. The scoped reader serves the Driver's inbox from `pending_driver_offers` and
Trip details from `assigned_trips`. Subscribe to `INSERT` on `realtime_signals` for generic wake-ups.

Update the Booking, Ride offer, Trip, Driver slot, and queue state in one transaction. Deferred
foreign keys verify the corresponding records at commit. Apply compare-and-swap updates to
`version` and set `updated_at` in the adapter. Use `stands.version` when changing Stand queue
membership or ordering. The Driver queue repository reads availability from the Driver slot
and an optional queue entry. Use `driver_slots.queue_version` for queue compare-and-swap writes
and keep the online entry at that version. Advance the slot's own `version` when its reservation
changes. Closing an accepted offer removes the queue entry as the Trip takes the slot. Town configuration changes increment `towns.version` in the same transaction.
Publish fare changes as a new chart version and switch the current chart in that transaction.
Read the latest Driver binding by session and version. Redeeming after revocation inserts a new
binding, leaving prior push subscription references intact.
Trip reads join the frozen Booking fare and Route. `rider_contacts.purge_after` limits reads and
indexes contacts due for removal.

[Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

## Dispatch sweep

1. Deploy the protected `POST /api/internal/dispatch/sweep` route and set its server-only
   `DISPATCH_SWEEP_TOKEN`. The route verifies the `Authorization: Bearer` header.
2. Check the request queue permissions before provisioning the token. Hosted projects can retain
   extension-owned grants on `net.http_request_queue`. The job stays idle while a Thamba database
   role can read its queued headers. Run this as the migration owner and confirm it returns
   zero rows. If grants remain on a hosted project, have Supabase restrict the extension ACL before
   enabling the job.

   ```sql
   select rolname
   from pg_roles
   where rolname in ('thamba_reader', 'thamba_writer', 'thamba_sweep')
     and has_schema_privilege(oid, 'net', 'USAGE')
     and has_column_privilege(oid, 'net.http_request_queue', 'headers', 'SELECT');
   ```

3. In the matching Supabase project's Vault, create `dispatch_sweep_app_url` with the HTTPS
   app origin and `dispatch_sweep_token` with the same token. Use the Vault dashboard to enter
   the token. Use separate values in each environment.
4. The migration registers `thamba-dispatch-sweep` every minute. Each run reads the latest
   Vault values and enqueues a request through `pg_net`. An unset origin or token leaves the job
   idle, including after a fresh local reset.
5. Check Cron job history for execution, then check HTTP status and timeouts on the restricted
   `net._http_response` table and verify that the route drained due work. Alert when two
   consecutive intervals pass without a successful sweep. Use the route's telemetry for
   sustained monitoring, since `pg_net` responses expire.

For token rotation, let the route accept both tokens briefly, update the existing Vault entry,
verify a successful sweep with the new token, and retire the old token.

[Supabase Cron](https://supabase.com/docs/guides/cron) · [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) · [Vault](https://supabase.com/docs/guides/database/vault)
