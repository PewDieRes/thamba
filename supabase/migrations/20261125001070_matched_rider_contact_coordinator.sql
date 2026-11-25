-- Keep Coordinator access scoped to the original or assigned Stand, including the Town and run.
create or replace function public.thamba_get_matched_rider_contact(target_booking_id uuid, subject uuid)
returns table (first_name text, phone_e164 text)
language sql stable security definer set search_path = '' as $$
  select contact.first_name, contact.phone_e164
  from public.rider_contacts contact
  left join public.trips trip on trip.booking_id = contact.booking_id
    and trip.town_id = contact.town_id and trip.run_scope_id = contact.run_scope_id
  where contact.booking_id = target_booking_id and contact.purge_after > statement_timestamp()
    and (
      trip.active_id is not null and exists (
        select from public.driver_devices device
        where device.driver_id = trip.driver_id and device.town_id = trip.town_id
          and device.run_scope_id = trip.run_scope_id and device.stand_id = trip.stand_id
          and device.status = 'active' and device.session_user_id = subject
      )
      or exists (
        select from public.coordinators coordinator
        join auth.users account on account.id = coordinator.coordinator_user_id
        where coordinator.coordinator_user_id = subject and coordinator.status = 'active'
          and account.is_anonymous is false
          and coordinator.town_id = contact.town_id and coordinator.run_scope_id = contact.run_scope_id
          and coordinator.stand_id in (contact.stand_id, trip.stand_id)
      )
    );
$$;
