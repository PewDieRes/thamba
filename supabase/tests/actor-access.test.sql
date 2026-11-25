begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to thamba_reader, thamba_writer, thamba_sweep, service_role, anon, authenticated;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000000101', true),
  ('00000000-0000-0000-0000-000000000102', true),
  ('00000000-0000-0000-0000-000000000103', true),
  ('00000000-0000-0000-0000-000000000104', true),
  ('00000000-0000-0000-0000-000000000105', true),
  ('00000000-0000-0000-0000-000000000106', false),
  ('00000000-0000-0000-0000-000000000107', false);
insert into stands (id, town_id, name, coordinator_contact)
values ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Other Stand', 'Demo');
insert into drivers (id, town_id, run_scope_id, stand_id, name, is_synthetic) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'Driver X', true),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'Driver Y', true),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'Driver Z', true);
insert into driver_devices (town_id, run_scope_id, stand_id, driver_id, session_user_id, status, bound_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103', 'active', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 'active', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000105', 'active', now());
insert into coordinators (town_id, run_scope_id, stand_id, coordinator_user_id, status) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000106', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000107', 'active');

insert into bookings (id, town_id, rider_user_id, stand_id, chart_version, route_id, fare_in_paise,
  status, requested_at, dispatch_deadline_at, pending_offer_id, next_due_at) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 1, '00000000-0000-0000-0000-000000000031', 6000, 'offering', now(), now() + interval '10 minutes', '00000000-0000-0000-0000-000000000401', now()),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000011', 1, '00000000-0000-0000-0000-000000000031', 6000, 'offering', now(), now() + interval '10 minutes', '00000000-0000-0000-0000-000000000402', now() + interval '10 minutes'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 1, '00000000-0000-0000-0000-000000000031', 6000, 'accepted', now(), now() + interval '10 minutes', null, null),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000011', 1, '00000000-0000-0000-0000-000000000031', 6000, 'requested', now(), now() + interval '10 minutes', null, now());
insert into booking_search_stands (town_id, run_scope_id, booking_id, stand_id, position)
select town_id, run_scope_id, id, stand_id, 0 from bookings
where id in ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000304');
insert into driver_slots (town_id, run_scope_id, stand_id, driver_id, pending_offer_id, active_trip_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000401', null),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000402', null),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000203', null, '00000000-0000-0000-0000-000000000501');
insert into driver_queue_entries (town_id, run_scope_id, stand_id, driver_id,
  queued_at_epoch_microseconds, reserved_offer_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000201', 1000000, '00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000202', 1000001, '00000000-0000-0000-0000-000000000402');
insert into ride_offers (id, town_id, run_scope_id, stand_id, booking_id, driver_id, issued_at, expires_at, status) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', now(), now() + interval '10 minutes', 'pending'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', now(), now() + interval '10 minutes', 'pending');
insert into trips (id, town_id, run_scope_id, stand_id, booking_id, driver_id, status, accepted_at)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000203', 'accepted', now());
insert into rider_contacts (town_id, run_scope_id, stand_id, booking_id, phone_e164, purge_after)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000303', ('+916' || repeat('0', 9)), now() + interval '1 hour');
insert into realtime_signals (town_id, run_scope_id, stand_id, recipient_user_id)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000103'), ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000104');
set constraints all immediate;
set constraints all deferred;

select plan(38);

select throws_ok($$ insert into ride_offers
    (town_id, run_scope_id, stand_id, booking_id, driver_id, issued_at, expires_at, status)
  select town_id, run_scope_id, stand_id, booking_id, '00000000-0000-0000-0000-000000000203',
    issued_at, expires_at, 'pending' from ride_offers where id = '00000000-0000-0000-0000-000000000401' $$,
  '23505', 'duplicate key value violates unique constraint "ride_offers_one_pending_per_booking"',
  'A Booking cannot get a second pending offer for another Driver');
select throws_ok($$ insert into ride_offers
    (town_id, run_scope_id, stand_id, booking_id, driver_id, issued_at, expires_at, status)
  select town_id, run_scope_id, stand_id, '00000000-0000-0000-0000-000000000304', driver_id,
    issued_at, expires_at, 'pending' from ride_offers where id = '00000000-0000-0000-0000-000000000401' $$,
  '23505', 'duplicate key value violates unique constraint "ride_offers_one_pending_per_driver"',
  'A Driver cannot get a second pending offer for another Booking');
select throws_ok($$ insert into trips
    (town_id, run_scope_id, stand_id, booking_id, driver_id, status, accepted_at)
  select town_id, run_scope_id, stand_id, '00000000-0000-0000-0000-000000000304', driver_id,
    'accepted', accepted_at from trips where id = '00000000-0000-0000-0000-000000000501' $$,
  '23505', 'duplicate key value violates unique constraint "trips_one_active_per_driver"',
  'A Driver cannot have two active Trips');
select throws_ok($$ update driver_slots set pending_offer_id = gen_random_uuid()
    where driver_id = '00000000-0000-0000-0000-000000000203' $$,
  '23514', null, 'A Driver slot cannot hold both a pending offer and an active Trip');

set constraints all immediate;
select throws_ok($$ insert into driver_queue_entries
    (town_id, run_scope_id, stand_id, driver_id, queued_at_epoch_microseconds)
  select town_id, run_scope_id, stand_id, driver_id, 1000002 from trips $$,
  '23503', null, 'A Driver with an active Trip cannot join the queue');
set constraints all deferred;

set local role thamba_reader;
set local thamba.town_id = '00000000-0000-0000-0000-000000000001';
set local thamba.demo_run_id = 'live';
set local thamba.stand_ids = '00000000-0000-0000-0000-000000000011,00000000-0000-0000-0000-000000000012';
set local thamba.actor_kind = 'rider';
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated","is_anonymous":true}';
select is((select count(*) from bookings where id = '00000000-0000-0000-0000-000000000301'), 1::bigint,
  'Rider A can read their Booking');
select is((select count(*) from bookings where id = '00000000-0000-0000-0000-000000000302'), 0::bigint,
  'Rider A cannot read Rider B Booking');
select is((select count(*) from rider_contacts), 0::bigint,
  'Rider A cannot read the phone on their own Booking');
select is((select count(*) from assigned_trips), 1::bigint,
  'Rider A can read the assigned Trip on their own Booking');
select is((select count(*) from thamba_private.rider_booking_scope('00000000-0000-0000-0000-000000000302')), 0::bigint,
  'Rider A cannot resolve Rider B scope');
select throws_ok($$ insert into fare_charts (town_id, chart_version, is_current, night_start_minute, night_end_minute) values ('00000000-0000-0000-0000-000000000001', 2, false, 0, 0) $$,
  '42501', null, 'Anonymous Rider cannot write Fare charts');

set local thamba.actor_kind = 'driver';
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated","is_anonymous":true}';
select is((select count(*) from pending_driver_offers where offer_id = '00000000-0000-0000-0000-000000000401'), 1::bigint,
  'Driver X can read their pickup-only offer');
select is((select count(*) from pending_driver_offers where offer_id = '00000000-0000-0000-0000-000000000402'), 0::bigint,
  'Driver X cannot read Driver Y offer');
select is((select count(*) from ride_offers), 0::bigint,
  'Driver X cannot read raw Ride offer rows');
select is((select count(*) from bookings), 0::bigint,
  'Driver X cannot read Booking terms through raw rows');
select is((select count(*) from assigned_trips), 0::bigint,
  'Driver X cannot read another Driver Trip');
select is((select count(*) from rider_contacts), 0::bigint,
  'An unmatched Driver cannot read the phone');
select throws_ok($$ select destination_landmark_id from pending_driver_offers $$,
  '42703', null, 'Pending offers omit destination');
select throws_ok($$ select fare_in_paise from pending_driver_offers $$,
  '42703', null, 'Pending offers omit fare');
select throws_ok($$ select rider_user_id from pending_driver_offers $$,
  '42703', null, 'Pending offers omit Rider identity');

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000105","role":"authenticated","is_anonymous":true}';
select is((select count(*) from rider_contacts where phone_e164 is not null), 1::bigint,
  'The matched Driver can read the phone during the active Trip');
select is((select count(*) from assigned_trips where destination_landmark_id is not null and fare_in_paise = 6000), 1::bigint,
  'The matched Driver can read the accepted destination and fare');

set local thamba.actor_kind = 'coordinator';
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000106","role":"authenticated","is_anonymous":false}';
select is((select count(*) from rider_contacts where phone_e164 is not null), 1::bigint,
  'The authorized Coordinator can read the phone');
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000107","role":"authenticated","is_anonymous":false}';
select is((select count(*) from rider_contacts), 0::bigint,
  'An unrelated Stand Coordinator cannot read the phone');
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000106","role":"authenticated","is_anonymous":true}';
select is((select count(*) from rider_contacts), 0::bigint,
  'An anonymous JWT cannot exercise Coordinator membership');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated","is_anonymous":true}';
select is((select count(*) from realtime_signals), 1::bigint,
  'The authenticated browser sees its own wake-up only');
select throws_ok($$ select * from bookings $$,
  '42501', null, 'The browser cannot read raw Bookings');
select throws_ok($$ select * from pending_driver_offers $$,
  '42501', null, 'Driver projections are served through the app');
select throws_ok($$ select phone_e164 from rider_contacts $$,
  '42501', null, 'The browser cannot query Rider contacts');
select throws_ok($$ insert into fare_charts (town_id, chart_version, is_current, night_start_minute, night_end_minute) values ('00000000-0000-0000-0000-000000000001', 2, false, 0, 0) $$,
  '42501', null, 'An anonymous JWT cannot write Fare charts in the Data API role');

reset role;
set local role anon;
select throws_ok($$ select id from realtime_signals $$,
  '42501', null, 'The unauthenticated role cannot read wake-ups');
reset role;
set local role service_role;
select is((select count(*) from fare_charts where town_id = '00000000-0000-0000-0000-000000000001'), 1::bigint,
  'The service role has an explicit catalog read grant');
select throws_ok($$ select phone_e164 from rider_contacts $$,
  '42501', null, 'The service role has no contact grant');

reset role;
set local role thamba_writer;
select throws_ok($$ select phone_e164 from rider_contacts $$,
  '42501', null, 'The command writer has no contact read grant');
set local thamba.stand_ids = '';
select is((select count(*) from bookings), 0::bigint,
  'The command writer sees no Bookings without Stand scope');
reset role;
set local role thamba_sweep;
select is((select count(*) from bookings), 2::bigint,
  'The sweep can see due Bookings only');
select throws_ok($$ select rider_user_id from bookings $$,
  '42501', null, 'The sweep cannot read Rider identity');

reset role;
update driver_slots set active_trip_id = null where driver_id = '00000000-0000-0000-0000-000000000203';
update trips set status = 'cancelled_by_rider', ended_at = now() where id = '00000000-0000-0000-0000-000000000501';
update bookings set status = 'cancelled_by_rider' where id = '00000000-0000-0000-0000-000000000303';
set constraints all immediate;
set local role thamba_reader;
set local thamba.actor_kind = 'driver';
set local thamba.stand_ids = '00000000-0000-0000-0000-000000000011';
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000105","role":"authenticated","is_anonymous":true}';
select is((select count(*) from rider_contacts), 0::bigint,
  'The matched Driver loses phone access when the Trip ends');

reset role;
select * from finish();
rollback;
