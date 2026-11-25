create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  name text not null,
  is_synthetic boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  check (run_scope_id = '00000000-0000-0000-0000-000000000000'::uuid or is_synthetic),
  unique (town_id, run_scope_id, stand_id, id)
);

create table public.driver_devices (
  id uuid primary key default gen_random_uuid(),
  session_user_id uuid not null references auth.users (id) on delete restrict,
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null,
  status text not null check (status in ('active', 'revoked')),
  bound_at timestamptz not null,
  revoked_at timestamptz check (revoked_at >= bound_at),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  check ((status = 'revoked') = (revoked_at is not null)),
  unique (session_user_id, version),
  unique (driver_id, id)
);

create unique index driver_devices_one_active_per_driver
  on public.driver_devices (driver_id) where status = 'active';
create unique index driver_devices_one_active_per_session
  on public.driver_devices (session_user_id) where status = 'active';

create table public.driver_invites (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('issued', 'redeemed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  redeemed_at timestamptz check (redeemed_at < expires_at),
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  check ((status = 'redeemed') = (redeemed_at is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

create index driver_invites_issued_by_driver on public.driver_invites (driver_id) where status = 'issued';

create table public.coordinators (
  id uuid primary key default gen_random_uuid(),
  coordinator_user_id uuid not null references auth.users (id) on delete restrict,
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  status text not null check (status in ('active', 'disabled')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  unique (coordinator_user_id, stand_id)
);

create table public.driver_slots (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null unique,
  pending_offer_id uuid,
  active_trip_id uuid,
  queue_driver_id uuid generated always as
    (case when active_trip_id is null then driver_id end) stored,
  queue_version integer not null default 1 check (queue_version > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  check (num_nonnulls(pending_offer_id, active_trip_id) <= 1),
  unique (driver_id, pending_offer_id),
  unique (driver_id, active_trip_id),
  unique (queue_driver_id, queue_version)
);

create table public.driver_queue_entries (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  driver_id uuid not null unique,
  queued_at_epoch_microseconds bigint not null,
  reserved_offer_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  foreign key (driver_id, version)
    references public.driver_slots (queue_driver_id, queue_version) on delete no action
    deferrable initially deferred,
  unique (driver_id, reserved_offer_id)
);

create index driver_queue_entries_rotation_order on public.driver_queue_entries
  (stand_id, queued_at_epoch_microseconds, driver_id);

alter table public.drivers enable row level security;
alter table public.driver_devices enable row level security;
alter table public.driver_invites enable row level security;
alter table public.coordinators enable row level security;
alter table public.driver_slots enable row level security;
alter table public.driver_queue_entries enable row level security;
revoke all on table
  public.drivers,
  public.driver_devices,
  public.driver_invites,
  public.coordinators,
  public.driver_slots,
  public.driver_queue_entries
from public, anon, authenticated, service_role;
