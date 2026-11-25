begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(12);

select ok(not has_function_privilege('authenticated', 'public.thamba_get_rider_booking(uuid,uuid)', 'execute'),
  'authenticated browser sessions cannot call the server Rider projection');
select ok(not has_function_privilege('authenticated', 'public.thamba_get_rider_booking(uuid)', 'execute'),
  'the previous Rider projection is unavailable to browser sessions');
select ok(not has_function_privilege('authenticated', 'public.thamba_can_read_booking(uuid)', 'execute'),
  'the previous ownership RPC is unavailable to browser sessions');
select ok(has_function_privilege('thamba_reader', 'public.thamba_get_rider_booking(uuid,uuid)', 'execute'),
  'the scoped reader can call the Rider projection');
select ok(not has_function_privilege('thamba_writer', 'public.thamba_repository_list(text,jsonb,text)', 'execute'),
  'the writer cannot call the provisioning snapshot query');
select ok(has_function_privilege('thamba_writer', 'public.thamba_scoped_repository_list(text,jsonb,text,jsonb)', 'execute'),
  'the writer can call the scoped snapshot query');
select ok(not has_function_privilege('thamba_writer', 'public.thamba_due_booking_ids(timestamptz,integer)', 'execute'),
  'the writer cannot enumerate due Bookings');
select ok(has_function_privilege('thamba_sweep', 'public.thamba_due_booking_ids(timestamptz,integer)', 'execute'),
  'the scoped sweep identity can enumerate due Bookings');

select ok(not has_function_privilege('authenticated', 'public.thamba_has_driver_device()', 'execute'),
  'the old Driver binding RPC is unavailable to browser sessions');
select ok(not has_function_privilege('authenticated', 'public.thamba_coordinator_memberships()', 'execute'),
  'the old Coordinator membership RPC is unavailable to browser sessions');
select ok(has_function_privilege('thamba_reader', 'public.thamba_has_driver_device(uuid)', 'execute'),
  'the server reader can resolve the verified Driver subject');
select ok(has_function_privilege('thamba_reader', 'public.thamba_coordinator_memberships(uuid)', 'execute'),
  'the server reader can resolve verified Coordinator memberships');

select * from finish();
rollback;
