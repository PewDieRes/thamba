# Local Supabase integration tests

Run from the repository root with Docker running. Use the local `thamba` stack and run a single integration suite at a time. The fixture setup uses the local database container to provision synthetic Auth users and prerequisite catalogue rows. The shared repository contracts use the service-role fixture API. Session and command tests exercise the Supabase anon key and provision temporary non-owner reader, writer and sweep logins in the local database.

```sh
pnpm install --frozen-lockfile
export SUPABASE_TELEMETRY_DISABLED=1
pnpm exec supabase start -x logflare,vector,studio,imgproxy,supavisor
pnpm exec supabase migration up --local
pnpm exec supabase test db
eval "$(pnpm exec supabase status -o env)"
export SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" SUPABASE_ANON_KEY="$ANON_KEY"
pnpm test:integration
```

The integration project runs the shared repository and Unit of Work contracts, a rollback check for a failed database constraint, a Demo Town ride through the server composition factory, concurrent invite redemption, revoked device denial, RLS-backed Rider isolation, and the shared request counter. Use `pnpm test:contract` to run the same shared contracts with the in-memory adapters.
