create table public.routes (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  pickup_landmark_id uuid not null check (pickup_landmark_id <> destination_landmark_id),
  destination_landmark_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, pickup_landmark_id) references public.landmarks (town_id, id) on delete restrict,
  foreign key (town_id, destination_landmark_id) references public.landmarks (town_id, id) on delete restrict,
  unique (town_id, id),
  unique (town_id, pickup_landmark_id, destination_landmark_id)
);

create table public.fare_charts (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.towns (id) on delete restrict,
  chart_version integer not null check (chart_version >= 0),
  is_current boolean not null default true,
  is_illustrative boolean not null default false,
  night_start_minute integer not null check (night_start_minute between 0 and 1439),
  night_end_minute integer not null check (night_end_minute between 0 and 1439),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (town_id, chart_version)
);

create unique index fare_charts_one_current_per_town on public.fare_charts (town_id) where is_current;

create table public.fare_routes (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  chart_version integer not null,
  route_id uuid not null,
  day_fare_in_paise bigint not null check (day_fare_in_paise between 0 and 9007199254740991),
  night_fare_in_paise bigint not null check (night_fare_in_paise between 0 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, chart_version)
    references public.fare_charts (town_id, chart_version) on delete restrict,
  foreign key (town_id, route_id) references public.routes (town_id, id) on delete restrict,
  unique (town_id, chart_version, route_id)
);

create table public.fare_quotes (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  demo_run_id uuid,
  run_scope_id uuid generated always as
    (coalesce(demo_run_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  rider_user_id uuid not null references auth.users (id) on delete restrict,
  chart_version integer not null,
  route_id uuid not null,
  fare_in_paise bigint not null check (fare_in_paise between 0 and 9007199254740991),
  passenger_count integer not null check (passenger_count > 0),
  is_night boolean not null,
  pickup_at timestamptz,
  expires_at timestamptz not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, demo_run_id, rider_user_id)
    references public.demo_runs (town_id, id, rider_user_id) on delete restrict,
  foreign key (town_id, chart_version, route_id)
    references public.fare_routes (town_id, chart_version, route_id) on delete restrict
);

create index fare_quotes_by_rider on public.fare_quotes (rider_user_id);

alter table public.routes enable row level security;
alter table public.fare_charts enable row level security;
alter table public.fare_routes enable row level security;
alter table public.fare_quotes enable row level security;

revoke all on table
  public.routes,
  public.fare_charts,
  public.fare_routes,
  public.fare_quotes
from public, anon, authenticated, service_role;
