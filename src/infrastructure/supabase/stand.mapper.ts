import type { Stand } from '@application/ports/stand-repository';
import { readTranslations } from './catalogue.mapper';
import type { Json, Tables } from './database.types';
import { readScope, versioned, writeScope } from './row.mapper';

type PickupCueRow = Pick<Tables<'stand_pickup_cues'>, 'landmark_id' | 'pickup_cue'>;

export type StandRow = Pick<
  Tables<'stands'>,
  'id' | 'town_id' | 'demo_run_id' | 'coordinator_contact' | 'version'
> & {
  pickup_cues: PickupCueRow[];
  neighbour_stand_ids: string[];
  name?: string;
  name_translations?: Json;
  coordinator_contact_translations?: Json;
};

export function fromStandRow(row: StandRow) {
  return versioned<Stand>(row, {
    ...readScope(row.town_id, row.demo_run_id),
    standId: row.id as Stand['standId'],
    coordinatorContact: row.coordinator_contact,
    ...(row.name === undefined || row.name === 'Stand' ? {} : { name: row.name }),
    ...readStandTranslations(row),
    neighbourStandIds: row.neighbour_stand_ids.map((id) => id as Stand['standId']),
    pickupCues: Object.fromEntries(
      row.pickup_cues.map(({ landmark_id, pickup_cue }) => [landmark_id, pickup_cue]),
    ),
  });
}

export function toStandRow(value: Stand): Omit<StandRow, 'version'> {
  return {
    ...writeScope(value),
    id: value.standId,
    coordinator_contact: value.coordinatorContact,
    neighbour_stand_ids: [...value.neighbourStandIds],
    pickup_cues: Object.entries(value.pickupCues).flatMap(([landmark_id, pickup_cue]) =>
      pickup_cue === undefined ? [] : [{ landmark_id, pickup_cue }],
    ),
  };
}

function readStandTranslations(row: StandRow) {
  const names = readTranslations(row.name_translations);
  const coordinatorContacts = readTranslations(row.coordinator_contact_translations);
  return {
    ...(Object.keys(names).length ? { names } : {}),
    ...(Object.keys(coordinatorContacts).length ? { coordinatorContacts } : {}),
  };
}
