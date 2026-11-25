create schema thamba_private;
revoke all on schema thamba_private from public, anon, authenticated, service_role;

create table public.towns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_translations jsonb not null default '{}' check (jsonb_typeof(name_translations) = 'object'),
  grievance_contact text not null,
  grievance_contact_translations jsonb not null default '{}'
    check (jsonb_typeof(grievance_contact_translations) = 'object'),
  booking_mode text not null check (booking_mode in ('simulated', 'live')),
  schedule_lead_time_milliseconds bigint check (schedule_lead_time_milliseconds >= 0),
  dispatch_duration_milliseconds bigint check (dispatch_duration_milliseconds > 0),
  offer_timeout_milliseconds bigint check (offer_timeout_milliseconds > 0),
  max_search_stands integer check (max_search_stands > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.licences (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null unique references public.towns (id) on delete restrict,
  ulin text not null unique check (btrim(ulin) <> ''),
  issuing_authority text not null check (btrim(issuing_authority) <> ''),
  valid_from_date date not null,
  valid_through_date date not null check (valid_through_date >= valid_from_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.simulation_profiles (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null unique references public.towns (id) on delete restrict,
  kind text not null check (kind = 'synthetic'),
  scenarios jsonb not null default '{}' check (jsonb_typeof(scenarios) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (town_id, id)
);

create table public.demo_runs (
  id uuid primary key default gen_random_uuid()
    check (id <> '00000000-0000-0000-0000-000000000000'::uuid),
  town_id uuid not null,
  simulation_profile_id uuid not null,
  rider_user_id uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null check (expires_at > created_at),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, simulation_profile_id)
    references public.simulation_profiles (town_id, id) on delete restrict,
  unique (town_id, id),
  unique (town_id, id, rider_user_id)
);

create table public.landmarks (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.towns (id) on delete restrict,
  slug text not null,
  name text not null,
  name_translations jsonb not null default '{}' check (jsonb_typeof(name_translations) = 'object'),
  is_illustrative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (town_id, slug),
  unique (town_id, id)
);

-- A non-null key keeps a live reference from matching the same Town's demo rows.
create table public.stands (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.towns (id) on delete restrict,
  demo_run_id uuid,
  run_scope_id uuid generated always as
    (coalesce(demo_run_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  name text not null,
  name_translations jsonb not null default '{}' check (jsonb_typeof(name_translations) = 'object'),
  coordinator_contact text not null,
  coordinator_contact_translations jsonb not null default '{}'
    check (jsonb_typeof(coordinator_contact_translations) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, demo_run_id) references public.demo_runs (town_id, id) on delete restrict,
  unique (town_id, run_scope_id, id)
);

create table public.stand_pickup_cues (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  landmark_id uuid not null,
  pickup_cue text not null,
  pickup_cue_translations jsonb not null default '{}'
    check (jsonb_typeof(pickup_cue_translations) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete cascade,
  foreign key (town_id, landmark_id) references public.landmarks (town_id, id) on delete restrict,
  unique (stand_id, landmark_id)
);

create table public.stand_neighbours (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null check (stand_id <> neighbour_stand_id),
  neighbour_stand_id uuid not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete cascade,
  foreign key (town_id, run_scope_id, neighbour_stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  unique (stand_id, neighbour_stand_id),
  unique (stand_id, position)
);

alter table public.towns enable row level security;
alter table public.licences enable row level security;
alter table public.simulation_profiles enable row level security;
alter table public.demo_runs enable row level security;
alter table public.landmarks enable row level security;
alter table public.stands enable row level security;
alter table public.stand_pickup_cues enable row level security;
alter table public.stand_neighbours enable row level security;

revoke all on table
  public.towns,
  public.licences,
  public.simulation_profiles,
  public.demo_runs,
  public.landmarks,
  public.stands,
  public.stand_pickup_cues,
  public.stand_neighbours
from public, anon, authenticated, service_role;
