create table public.command_log (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.towns (id) on delete restrict,
  demo_run_id uuid,
  run_scope_id uuid generated always as
    (coalesce(demo_run_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  actor text not null check (btrim(actor) <> ''),
  command_key text not null check (btrim(command_key) <> ''),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, demo_run_id) references public.demo_runs (town_id, id) on delete restrict,
  unique (actor, command_key)
);

create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  booking_id uuid,
  driver_id uuid,
  event_type text not null check (btrim(event_type) <> ''),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  foreign key (town_id, run_scope_id, booking_id)
    references public.bookings (town_id, run_scope_id, id) on delete restrict,
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  unique (town_id, run_scope_id, stand_id, driver_id, id)
);

create index domain_events_by_stand on public.domain_events (stand_id, occurred_at, id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null,
  driver_device_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  status text not null check (status in ('active', 'revoked')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  foreign key (driver_id, driver_device_id)
    references public.driver_devices (driver_id, id) on delete restrict,
  unique (driver_id, id)
);

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null,
  event_id uuid not null,
  subscription_id uuid not null,
  offer_id uuid not null,
  status text not null check (status in ('pending', 'delivered', 'discarded')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_due_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id, event_id)
    references public.domain_events (town_id, run_scope_id, stand_id, driver_id, id) on delete cascade,
  foreign key (driver_id, subscription_id)
    references public.push_subscriptions (driver_id, id) on delete cascade,
  foreign key (town_id, run_scope_id, stand_id, driver_id, offer_id)
    references public.ride_offers (town_id, run_scope_id, stand_id, driver_id, id) on delete cascade,
  check ((status = 'pending') = (next_due_at is not null)),
  unique (event_id, subscription_id)
);

create index push_deliveries_due on public.push_deliveries (next_due_at, id) where next_due_at is not null;

create table public.realtime_signals (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete cascade
);

create index realtime_signals_by_recipient on public.realtime_signals (recipient_user_id, created_at);
alter publication supabase_realtime add table public.realtime_signals (id, recipient_user_id, created_at);

create table public.simulation_steps (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  demo_run_id uuid not null,
  stand_id uuid not null,
  booking_id uuid not null,
  driver_id uuid not null,
  command_key text not null,
  step_type text not null check (step_type in ('accept', 'decline', 'arrive', 'start', 'complete')),
  status text not null check (status in ('pending', 'completed', 'discarded')),
  next_due_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, demo_run_id, booking_id)
    references public.bookings (town_id, run_scope_id, id) on delete restrict,
  foreign key (town_id, demo_run_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  check (demo_run_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  check ((status = 'pending') = (next_due_at is not null)),
  unique (booking_id, command_key)
);

create index simulation_steps_due on public.simulation_steps (next_due_at, id) where next_due_at is not null;

alter table public.command_log enable row level security;
alter table public.domain_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.realtime_signals enable row level security;
alter table public.simulation_steps enable row level security;
revoke all on table
  public.command_log,
  public.domain_events,
  public.push_subscriptions,
  public.push_deliveries,
  public.realtime_signals,
  public.simulation_steps
from public, anon, authenticated, service_role;
