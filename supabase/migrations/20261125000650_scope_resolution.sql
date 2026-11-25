create function thamba_private.rider_booking_scope(target_booking_id uuid)
returns table (town_id uuid, demo_run_id uuid, stand_id uuid)
language sql stable security definer set search_path = ''
as $$
  select booking.town_id, booking.demo_run_id, booking.stand_id
  from public.bookings as booking
  where booking.id = target_booking_id and booking.rider_user_id = auth.uid()
    and thamba_private.is_anonymous_actor('rider');
$$;

create function thamba_private.driver_invite_scope(target_token_hash text)
returns table (town_id uuid, run_scope_id uuid, stand_id uuid)
language sql stable security definer set search_path = ''
as $$
  select invite.town_id, invite.run_scope_id, invite.stand_id
  from public.driver_invites as invite
  where invite.token_hash = target_token_hash and thamba_private.is_anonymous_actor('driver');
$$;

-- An Offer response may need the original Stand as well as the Driver's Stand.
create function thamba_private.driver_offer_command_scope(target_offer_id uuid)
returns table (town_id uuid, demo_run_id uuid, original_stand_id uuid, assigned_stand_id uuid)
language sql stable security definer set search_path = ''
as $$
  select booking.town_id, booking.demo_run_id, booking.stand_id, offer.stand_id
  from public.ride_offers as offer
  join public.bookings as booking on booking.id = offer.booking_id
  where offer.id = target_offer_id and thamba_private.is_bound_driver(offer.driver_id);
$$;

revoke all on function thamba_private.rider_booking_scope(uuid),
  thamba_private.driver_invite_scope(text), thamba_private.driver_offer_command_scope(uuid)
from public, anon, authenticated, service_role;
grant execute on function thamba_private.rider_booking_scope(uuid),
  thamba_private.driver_invite_scope(text), thamba_private.driver_offer_command_scope(uuid)
to thamba_reader;
