create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  demo_run_id uuid,
  run_scope_id uuid generated always as
    (coalesce(demo_run_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  rider_user_id uuid not null references auth.users (id) on delete restrict,
  stand_id uuid not null,
  chart_version integer not null,
  route_id uuid not null,
  fare_in_paise bigint not null check (fare_in_paise between 0 and 9007199254740991),
  status text not null check (status in (
    'scheduled', 'requested', 'offering', 'accepted', 'driver_arrived', 'in_trip', 'completed',
    'cancelled_by_rider', 'cancelled_by_driver', 'no_driver_found'
  )),
  no_driver_found_reason text
    check (no_driver_found_reason in ('dispatch_deadline', 'booking_unavailable', 'stands_exhausted')),
  pickup_at timestamptz,
  request_due_at timestamptz,
  requested_at timestamptz,
  dispatch_deadline_at timestamptz,
  pending_offer_id uuid,
  next_due_at timestamptz,
  requires_trip_booking_id uuid generated always as (
    case when status in ('accepted', 'driver_arrived', 'in_trip', 'completed', 'cancelled_by_driver')
      then id end
  ) stored,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, demo_run_id, rider_user_id)
    references public.demo_runs (town_id, id, rider_user_id) on delete restrict,
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  foreign key (town_id, chart_version, route_id)
    references public.fare_routes (town_id, chart_version, route_id) on delete restrict,
  check ((status = 'offering') = (pending_offer_id is not null)),
  check ((status = 'no_driver_found') = (no_driver_found_reason is not null)),
  check ((pickup_at is null) = (request_due_at is null)),
  check (request_due_at <= pickup_at),
  check ((requested_at is null) = (dispatch_deadline_at is null)),
  check (requested_at < dispatch_deadline_at),
  check (requested_at >= request_due_at),
  check (status <> 'scheduled' or (request_due_at is not null and requested_at is null)),
  check (status in ('scheduled', 'cancelled_by_rider', 'no_driver_found') or requested_at is not null),
  check (next_due_at is null or status in ('scheduled', 'requested', 'offering')),
  unique (town_id, run_scope_id, id),
  unique (town_id, run_scope_id, stand_id, id),
  unique (id, status),
  unique (id, pending_offer_id)
);

create index bookings_due on public.bookings (next_due_at, id) where next_due_at is not null;
create index bookings_by_rider on public.bookings (rider_user_id);

create table public.booking_search_stands (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  booking_id uuid not null,
  stand_id uuid not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, booking_id)
    references public.bookings (town_id, run_scope_id, id) on delete cascade,
  foreign key (town_id, run_scope_id, stand_id)
    references public.stands (town_id, run_scope_id, id) on delete restrict,
  unique (booking_id, position),
  unique (booking_id, stand_id)
);

create table public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  booking_id uuid not null,
  driver_id uuid not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > issued_at),
  status text not null check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  pending_id uuid generated always as (case when status = 'pending' then id end) stored,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, booking_id)
    references public.bookings (town_id, run_scope_id, id) on delete restrict,
  foreign key (booking_id, stand_id)
    references public.booking_search_stands (booking_id, stand_id) on delete restrict,
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  foreign key (booking_id, pending_id) references public.bookings (id, pending_offer_id)
    on delete no action deferrable initially deferred,
  foreign key (driver_id, pending_id) references public.driver_slots (driver_id, pending_offer_id)
    on delete no action deferrable initially deferred,
  foreign key (driver_id, pending_id) references public.driver_queue_entries (driver_id, reserved_offer_id)
    on delete no action deferrable initially deferred,
  unique (booking_id, driver_id),
  unique (booking_id, pending_id),
  unique (driver_id, pending_id),
  unique (town_id, run_scope_id, stand_id, driver_id, id)
);

create unique index ride_offers_one_pending_per_booking on public.ride_offers (booking_id)
  where status = 'pending';
create unique index ride_offers_one_pending_per_driver on public.ride_offers (driver_id)
  where status = 'pending';

-- Deferred references bind the projections of one reservation at commit.
alter table public.bookings add constraint bookings_pending_offer_fk
  foreign key (id, pending_offer_id) references public.ride_offers (booking_id, pending_id)
  on delete no action deferrable initially deferred;
alter table public.driver_slots add constraint driver_slots_pending_offer_fk
  foreign key (driver_id, pending_offer_id) references public.ride_offers (driver_id, pending_id)
  on delete no action deferrable initially deferred;
alter table public.driver_queue_entries add constraint driver_queue_entries_reserved_offer_fk
  foreign key (driver_id, reserved_offer_id) references public.ride_offers (driver_id, pending_id)
  on delete no action deferrable initially deferred;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  booking_id uuid not null unique,
  driver_id uuid not null,
  status text not null check (status in (
    'accepted', 'driver_arrived', 'in_trip', 'completed', 'cancelled_by_rider', 'cancelled_by_driver'
  )),
  active_id uuid generated always as (
    case when status in ('accepted', 'driver_arrived', 'in_trip') then id end
  ) stored,
  accepted_at timestamptz not null,
  arrived_at timestamptz check (arrived_at >= accepted_at),
  picked_up_at timestamptz check (
    picked_up_at is null or (arrived_at is not null and picked_up_at >= arrived_at)
  ),
  ended_at timestamptz check (ended_at >= coalesce(picked_up_at, arrived_at, accepted_at)),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, booking_id)
    references public.bookings (town_id, run_scope_id, id) on delete restrict,
  foreign key (booking_id, stand_id)
    references public.booking_search_stands (booking_id, stand_id) on delete restrict,
  foreign key (town_id, run_scope_id, stand_id, driver_id)
    references public.drivers (town_id, run_scope_id, stand_id, id) on delete restrict,
  foreign key (booking_id, status) references public.bookings (id, status)
    on delete no action deferrable initially deferred,
  foreign key (driver_id, active_id) references public.driver_slots (driver_id, active_trip_id)
    on delete no action deferrable initially deferred,
  check ((active_id is null) = (ended_at is not null)),
  check (status <> 'accepted' or arrived_at is null),
  check (status <> 'driver_arrived' or (arrived_at is not null and picked_up_at is null)),
  check (status not in ('in_trip', 'completed') or picked_up_at is not null),
  unique (driver_id, active_id)
);

create unique index trips_one_active_per_driver on public.trips (driver_id)
  where status in ('accepted', 'driver_arrived', 'in_trip');

alter table public.bookings add constraint bookings_required_trip_fk
  foreign key (requires_trip_booking_id) references public.trips (booking_id)
  on delete no action deferrable initially deferred;
alter table public.driver_slots add constraint driver_slots_active_trip_fk
  foreign key (driver_id, active_trip_id) references public.trips (driver_id, active_id)
  on delete no action deferrable initially deferred;

create table public.rider_contacts (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null,
  run_scope_id uuid not null,
  stand_id uuid not null,
  booking_id uuid not null unique,
  phone_e164 text not null check (phone_e164 ~ '^[+]91[6-9][0-9]{9}$'),
  purge_after timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (town_id, run_scope_id, stand_id, booking_id)
    references public.bookings (town_id, run_scope_id, stand_id, id) on delete cascade
);

create index rider_contacts_due_for_purge on public.rider_contacts (purge_after, id);

alter table public.bookings enable row level security;
alter table public.booking_search_stands enable row level security;
alter table public.ride_offers enable row level security;
alter table public.trips enable row level security;
alter table public.rider_contacts enable row level security;
revoke all on table
  public.bookings,
  public.booking_search_stands,
  public.ride_offers,
  public.trips,
  public.rider_contacts
from public, anon, authenticated, service_role;
