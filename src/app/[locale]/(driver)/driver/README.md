# Driver PWA

The install starts at `/mr/driver`. Open a Coordinator-issued invite in the
Driver browser, confirm it, then open the Driver page. The browser needs a
secure context for service-worker registration.

The Driver page reads state and pending offers every three seconds and
refreshes on reconnect. It reads the pending offer through the pickup-only
projection. The Driver state response includes destination, fare and the
matched Rider contact when there is an active Trip and the contact has been
provisioned. Completion hides the Trip and leaves the Driver offline until
they rejoin the queue.

The worker precaches public offline pages and icons. When a home navigation
fails, it serves the localized offline page from that cache. Driver actions
require a connection.

The mobile Playwright journey uses local Supabase and an isolated Demo run.
It supplies a manual Driver invite and a synthetic Rider contact, then checks
the Driver lifecycle and the Rider's completion in separate browser contexts.
Run it against the production build with
`pnpm test:e2e --project=mobile-chrome tests/e2e/driver-journey.spec.ts`.
