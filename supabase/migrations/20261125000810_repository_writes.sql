create type thamba_private.repository_row_write as (
  key_filter jsonb,
  row_data jsonb,
  expected_version integer
);

-- Callers are fixed private functions. Table and column names never come from request JSON.
create function thamba_private.save_repository_row(
  relation regclass, fields text[], write thamba_private.repository_row_write
) returns void language plpgsql set search_path = '' as $$
declare columns_sql text; values_sql text; assignments_sql text; lookup_sql text;
  target_id uuid; affected integer;
begin
  select string_agg(format('%I', field), ','),
    string_agg(format('source.%I', field), ','),
    string_agg(format('%1$I = source.%1$I', field), ',')
  into columns_sql, values_sql, assignments_sql from unnest(fields) field;

  if write.expected_version is null then
    execute format('insert into %1$s (%2$s) select %3$s from jsonb_populate_record(null::%1$s, $1) source',
      relation, columns_sql, values_sql) using write.row_data;
    return;
  end if;

  select string_agg(case when value = 'null'::jsonb then format('previous.%I is null', key)
    else format('previous.%1$I = lookup.%1$I', key) end, ' and ')
  into lookup_sql from jsonb_each(write.key_filter);
  execute format('select previous.id from %1$s previous,
    jsonb_populate_record(null::%1$s, $1) lookup where %2$s', relation, lookup_sql)
  into target_id using write.key_filter;

  execute format('update %1$s as target set %2$s, version = $2 + 1, updated_at = statement_timestamp()
    from jsonb_populate_record(null::%1$s, $3) source
    where target.id = $1 and target.version = $2', relation, assignments_sql)
  using target_id, write.expected_version, write.row_data;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception using errcode = '40001', message = 'Repository version changed';
  end if;
end;
$$;

create function thamba_private.save_repository_town(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare town public.towns; licence public.licences; profile_id uuid;
begin
  town := jsonb_populate_record(null::public.towns, row_data);
  perform thamba_private.save_repository_row('public.towns',
      array['id','slug','name','grievance_contact','booking_mode',
      'schedule_lead_time_milliseconds','dispatch_duration_milliseconds',
      'offer_timeout_milliseconds','max_search_stands'],
      row(jsonb_build_object('id', town.id), row_data, expected_version)::thamba_private.repository_row_write);

  if row_data->'licence' = 'null'::jsonb then
    delete from public.licences where town_id = town.id;
  else
    licence := jsonb_populate_record(null::public.licences, row_data->'licence');
    insert into public.licences (town_id, ulin, issuing_authority, valid_from_date, valid_through_date)
      values (town.id, licence.ulin, licence.issuing_authority, licence.valid_from_date, licence.valid_through_date)
    on conflict (town_id) do update set ulin = excluded.ulin, issuing_authority = excluded.issuing_authority,
      valid_from_date = excluded.valid_from_date, valid_through_date = excluded.valid_through_date;
  end if;

  if (row_data->>'has_simulation_profile')::boolean then
    insert into public.simulation_profiles (town_id, kind) values (town.id, 'synthetic')
      on conflict (town_id) do nothing;
    select id into strict profile_id from public.simulation_profiles where town_id = town.id;
  else
    delete from public.simulation_profiles where town_id = town.id;
  end if;

  insert into public.demo_runs (id, town_id, simulation_profile_id, rider_user_id, expires_at)
  select run.id, town.id, profile_id, run.rider_user_id, statement_timestamp() + interval '1 day'
  from jsonb_to_recordset(row_data->'demo_runs') run(id uuid, rider_user_id uuid)
  on conflict (id) do nothing;
end;
$$;

create function thamba_private.save_repository_stand(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare stand public.stands; scope_id uuid;
begin
  stand := jsonb_populate_record(null::public.stands, row_data);
  scope_id := coalesce(stand.demo_run_id, '00000000-0000-0000-0000-000000000000');
  if expected_version is null then
    row_data := row_data || jsonb_build_object('name', 'Stand');
    perform thamba_private.save_repository_row('public.stands',
      array['id','town_id','demo_run_id','name','coordinator_contact'],
      row(jsonb_build_object('id', stand.id), row_data, null)::thamba_private.repository_row_write);
  else
    perform thamba_private.save_repository_row('public.stands',
      array['coordinator_contact'],
      row(jsonb_build_object('id', stand.id, 'town_id', stand.town_id, 'demo_run_id', stand.demo_run_id), row_data, expected_version)::thamba_private.repository_row_write);
  end if;

  delete from public.stand_pickup_cues cue where stand_id = stand.id
    and not exists (select from jsonb_to_recordset(row_data->'pickup_cues') item(landmark_id uuid)
      where item.landmark_id = cue.landmark_id);
  insert into public.stand_pickup_cues (town_id, run_scope_id, stand_id, landmark_id, pickup_cue)
  select stand.town_id, scope_id, stand.id, item.landmark_id, item.pickup_cue
    from jsonb_to_recordset(row_data->'pickup_cues') item(landmark_id uuid, pickup_cue text)
  on conflict (stand_id, landmark_id) do update set pickup_cue = excluded.pickup_cue;

  delete from public.stand_neighbours where stand_id = stand.id;
  insert into public.stand_neighbours (town_id, run_scope_id, stand_id, neighbour_stand_id, position)
  select stand.town_id, scope_id, stand.id, item.id::uuid, item.position - 1
  from jsonb_array_elements_text(row_data->'neighbour_stand_ids') with ordinality item(id, position);
end;
$$;

create function thamba_private.save_repository_booking(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare booking public.bookings; saved_search jsonb;
begin
  booking := jsonb_populate_record(null::public.bookings, row_data);
  perform thamba_private.save_repository_row('public.bookings',
      array['id','town_id','demo_run_id','rider_user_id','stand_id',
      'chart_version','route_id','fare_in_paise','status','no_driver_found_reason','pickup_at',
      'request_due_at','requested_at','dispatch_deadline_at','pending_offer_id','next_due_at'],
      row(jsonb_build_object('id', booking.id), row_data, expected_version)::thamba_private.repository_row_write);

  select jsonb_agg(stand_id order by position) into saved_search
    from public.booking_search_stands where booking_id = booking.id;
  if saved_search is distinct from nullif(row_data->'search_stand_ids', 'null'::jsonb) then
    delete from public.booking_search_stands where booking_id = booking.id;
    insert into public.booking_search_stands (town_id, run_scope_id, booking_id, stand_id, position)
      select booking.town_id, coalesce(booking.demo_run_id, '00000000-0000-0000-0000-000000000000'),
        booking.id, item.id::uuid, item.position - 1
      from jsonb_array_elements_text(row_data->'search_stand_ids') with ordinality item(id, position);
  end if;
end;
$$;

create function thamba_private.save_repository_queue(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare slot public.driver_slots; queue_time bigint;
begin
  slot := jsonb_populate_record(null::public.driver_slots, row_data);
  queue_time := (row_data->>'queued_at_epoch_microseconds')::bigint;
  if expected_version is null then
    insert into public.driver_slots (town_id, run_scope_id, stand_id, driver_id, pending_offer_id)
      values (slot.town_id, slot.run_scope_id, slot.stand_id, slot.driver_id, slot.pending_offer_id);
  else
    perform thamba_private.save_repository_row('public.driver_slots',
      array['pending_offer_id','queue_version'],
      row(jsonb_build_object('driver_id', slot.driver_id, 'town_id', slot.town_id,
        'run_scope_id', slot.run_scope_id, 'stand_id', slot.stand_id), row_data || jsonb_build_object('queue_version', expected_version + 1), expected_version)::thamba_private.repository_row_write);
  end if;

  if queue_time is null then
    delete from public.driver_queue_entries where driver_id = slot.driver_id;
  else
    insert into public.driver_queue_entries (town_id, run_scope_id, stand_id, driver_id,
      queued_at_epoch_microseconds, reserved_offer_id, version)
      values (slot.town_id, slot.run_scope_id, slot.stand_id, slot.driver_id, queue_time,
        slot.pending_offer_id, coalesce(expected_version, 0) + 1)
    on conflict (driver_id) do update set queued_at_epoch_microseconds = excluded.queued_at_epoch_microseconds,
      reserved_offer_id = excluded.reserved_offer_id, version = excluded.version;
  end if;
end;
$$;

create function thamba_private.save_repository_trip(row_data jsonb, expected_version integer)
returns void language plpgsql set search_path = '' as $$
declare trip public.trips;
begin
  trip := jsonb_populate_record(null::public.trips, row_data);
  perform thamba_private.save_repository_row('public.trips',
      array['id','town_id','run_scope_id','stand_id','booking_id','driver_id','status',
      'accepted_at','arrived_at','picked_up_at','ended_at'],
      row(jsonb_build_object('id', trip.id, 'booking_id', trip.booking_id), row_data, expected_version)::thamba_private.repository_row_write);

  -- A booking confirmation and its queue release can be staged in either order. The
  -- deferred references validate the complete reservation at the end of the RPC.
  if trip.ended_at is null then
    update public.driver_slots set active_trip_id = trip.id, pending_offer_id = null
      where driver_id = trip.driver_id;
  else
    update public.driver_slots set active_trip_id = null
      where driver_id = trip.driver_id and active_trip_id = trip.id;
  end if;
end;
$$;
