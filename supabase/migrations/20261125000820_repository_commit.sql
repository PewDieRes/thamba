create function thamba_private.save_repository_fares(chart public.fare_charts, fares jsonb)
returns void language plpgsql set search_path = '' as $$
declare fare jsonb; route_position integer := 0;
begin
  for fare in select value from jsonb_array_elements(fares) loop
    insert into public.routes (id, town_id, pickup_landmark_id, destination_landmark_id)
      values ((fare->>'route_id')::uuid, chart.town_id,
        (fare->>'pickup_landmark_id')::uuid, (fare->>'destination_landmark_id')::uuid)
    on conflict (id) do nothing;
    insert into public.fare_routes (town_id, chart_version, route_id, day_fare_in_paise, night_fare_in_paise, position)
      values (chart.town_id, chart.chart_version, (fare->>'route_id')::uuid,
        (fare->>'day_fare_in_paise')::bigint, (fare->>'night_fare_in_paise')::bigint, route_position)
    on conflict (town_id, chart_version, route_id) do update set
      day_fare_in_paise = excluded.day_fare_in_paise, night_fare_in_paise = excluded.night_fare_in_paise,
      position = excluded.position;
    route_position := route_position + 1;
  end loop;

  delete from public.fare_routes existing where existing.town_id = chart.town_id
    and existing.chart_version = chart.chart_version and not exists (
      select from jsonb_array_elements(fares) fare_row
      where (fare_row->>'route_id')::uuid = existing.route_id
    );
end;
$$;

create function thamba_private.save_repository_chart(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare chart public.fare_charts; current_chart public.fare_charts;
begin
  chart := jsonb_populate_record(null::public.fare_charts, row_data);
  select * into current_chart from public.fare_charts where town_id = chart.town_id and is_current;
  if current_chart.version is distinct from expected_version then
    raise exception using errcode = '40001', message = 'Fare Chart version changed';
  end if;

  if current_chart.chart_version = chart.chart_version then
    perform thamba_private.save_repository_row('public.fare_charts',
      array['night_start_minute','night_end_minute'],
      row(jsonb_build_object('id', current_chart.id), row_data, expected_version)::thamba_private.repository_row_write);
  else
    if current_chart.id is not null then
      update public.fare_charts set is_current = false, updated_at = statement_timestamp()
        where id = current_chart.id and version = expected_version;
      if not found then
        raise exception using errcode = '40001', message = 'Fare Chart version changed';
      end if;
    end if;
    insert into public.fare_charts (town_id, chart_version, night_start_minute, night_end_minute, version)
      values (chart.town_id, chart.chart_version, chart.night_start_minute, chart.night_end_minute,
        coalesce(expected_version, 0) + 1);
  end if;

  perform thamba_private.save_repository_fares(chart, row_data->'route_fares');
end;
$$;

create function thamba_private.save_repository_device(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare device public.driver_devices; driver public.drivers; previous_id uuid;
begin
  device := jsonb_populate_record(null::public.driver_devices, row_data);
  select * into strict driver from public.drivers where id = device.driver_id;
  if expected_version is null then
    if exists (select from public.driver_devices where session_user_id = device.session_user_id) then
      raise exception using errcode = '40001', message = 'Device version changed';
    end if;
    insert into public.driver_devices (town_id, run_scope_id, stand_id, driver_id, session_user_id,
      bound_at, revoked_at, status)
    values (driver.town_id, driver.run_scope_id, driver.stand_id, device.driver_id,
      device.session_user_id, device.bound_at, device.revoked_at, device.status);
  else
    select id into previous_id from thamba_private.repository_devices where session_user_id = device.session_user_id;
    perform thamba_private.save_repository_row('public.driver_devices',
      array['town_id','run_scope_id','stand_id','driver_id','bound_at','revoked_at','status'],
      row(jsonb_build_object('id', previous_id), row_data || jsonb_build_object('town_id', driver.town_id, 'run_scope_id', driver.run_scope_id,
        'stand_id', driver.stand_id), expected_version)::thamba_private.repository_row_write);
  end if;
end;
$$;

create function thamba_private.save_repository_event(row_data jsonb) returns void
language plpgsql set search_path = '' as $$
declare event public.domain_events;
begin
  event := jsonb_populate_record(null::public.domain_events, row_data);
  if event.stand_id is null then
    select stand_id into strict event.stand_id from public.bookings where id = event.booking_id;
  end if;
  insert into public.domain_events (id, town_id, run_scope_id, stand_id, booking_id,
    driver_id, event_type, payload, occurred_at)
  values (event.id, event.town_id, event.run_scope_id, event.stand_id, event.booking_id,
    event.driver_id, event.event_type, event.payload, event.occurred_at);
end;
$$;

create function thamba_private.save_repository_entity(resource text, row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare key_filter jsonb; relation regclass; fields text[];
begin
  case resource
    when 'offers' then
      key_filter := jsonb_build_object('id', row_data->'id');
      relation := 'public.ride_offers';
      fields := array['id','town_id','run_scope_id','stand_id','booking_id','driver_id','issued_at','expires_at','status'];
    when 'invites' then
      key_filter := jsonb_build_object('token_hash', row_data->'token_hash');
      relation := 'public.driver_invites';
      fields := array['town_id','run_scope_id','stand_id','driver_id','token_hash','status',
        'expires_at','redeemed_at','revoked_at'];
    when 'quotes' then
      key_filter := jsonb_build_object('id', row_data->'id');
      relation := 'public.fare_quotes';
      fields := array['id','town_id','demo_run_id','rider_user_id','chart_version','route_id',
        'fare_in_paise','passenger_count','is_night','pickup_at','expires_at'];
    when 'commands' then
      key_filter := jsonb_build_object('actor', row_data->'actor', 'command_key', row_data->'command_key');
      relation := 'public.command_log';
      fields := array['actor','command_key','input_hash','result'];
      if expected_version is null then
        fields := fields || array['town_id','demo_run_id'];
      end if;
    else raise exception using errcode = '22023', message = 'Unsupported repository resource';
  end case;
  perform thamba_private.save_repository_row(relation,
      fields,
      row(key_filter, row_data, expected_version)::thamba_private.repository_row_write);
end;
$$;

create function thamba_private.apply_repository_write(intent jsonb, command_scope jsonb)
returns void language plpgsql set search_path = '' as $$
declare row_data jsonb := intent->'row'; resource text := intent->>'resource';
  expected_version integer := (intent->>'expectedVersion')::integer;
begin
  case resource
    when 'towns' then perform thamba_private.save_repository_town(row_data, expected_version);
    when 'stands' then perform thamba_private.save_repository_stand(row_data, expected_version);
    when 'charts' then perform thamba_private.save_repository_chart(row_data, expected_version);
    when 'queue' then perform thamba_private.save_repository_queue(row_data, expected_version);
    when 'bookings' then perform thamba_private.save_repository_booking(row_data, expected_version);
    when 'trips' then perform thamba_private.save_repository_trip(row_data, expected_version);
    when 'devices' then perform thamba_private.save_repository_device(row_data, expected_version);
    when 'events' then perform thamba_private.save_repository_event(row_data);
    when 'commands' then
      perform thamba_private.save_repository_entity(resource, row_data || command_scope, expected_version);
    else perform thamba_private.save_repository_entity(resource, row_data, expected_version);
  end case;
end;
$$;

create function public.thamba_repository_commit(
  writes jsonb, expected_revision text default null, command_scope jsonb default '{}'
) returns void language plpgsql set search_path = '' security definer as $$
declare current_revision text; intent jsonb;
begin
  select revision::text into strict current_revision from thamba_private.repository_revision where singleton for update;
  if expected_revision is not null and current_revision <> expected_revision then
    raise exception using errcode = '40001', message = 'Repository snapshot changed';
  end if;
  for intent in select value from jsonb_array_elements(writes) loop
    perform thamba_private.apply_repository_write(intent, command_scope);
  end loop;
end;
$$;

revoke all on function public.thamba_repository_commit(jsonb, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.thamba_repository_commit(jsonb, text, jsonb) to service_role;

revoke all on function thamba_private.save_repository_chart(jsonb, integer),
  thamba_private.save_repository_device(jsonb, integer), thamba_private.save_repository_event(jsonb),
  thamba_private.apply_repository_write(jsonb, jsonb),
  thamba_private.save_repository_entity(text, jsonb, integer),
  thamba_private.save_repository_fares(public.fare_charts, jsonb) from public;
