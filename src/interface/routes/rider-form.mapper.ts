import type {
  CatalogueLandmark,
  CatalogueStand,
  Locale,
  TownOverviewView,
} from '@application/contracts/town-overview-view';
import { localizeText, mapTownNotices } from './rider-display.mapper';

const INDIA_UTC_OFFSET = '+05:30';
const PASSENGER_OPTIONS = [1, 2, 3] as const;

type PickupStand = Pick<CatalogueStand, 'id' | 'pickupLandmarkIds'>;

export type RideFormValues = {
  from: string;
  to: string;
  passengers: number;
  when: 'now' | 'later';
  date: string;
};

export function mapRiderForm(
  town: TownOverviewView,
  locale: Locale,
  options: { from?: string | undefined; standId?: string | undefined } = {},
) {
  return {
    locale,
    townId: town.townId,
    notices: mapTownNotices(town, locale),
    isDemo: town.capability.kind === 'simulated',
    stands: town.stands
      .filter(({ id }) => !options.standId || id === options.standId)
      .map(({ id, pickupLandmarkIds }) => ({ id, pickupLandmarkIds })),
    passengerOptions: PASSENGER_OPTIONS,
    landmarks: town.landmarks.map((point) => mapLandmark(point, locale)),
    preselection: town.landmarks.find((point) => point.slug === options.from)?.id ?? '',
  };
}

function mapLandmark(point: CatalogueLandmark, locale: Locale) {
  return {
    id: point.id,
    label: localizeText(locale, point.name, point.names),
    searchable: [point.name, point.names.en, point.names.mr, point.names[locale]]
      .filter(Boolean)
      .join(' ')
      .normalize('NFC')
      .toLowerCase(),
  };
}

export type LandmarkOption = ReturnType<typeof mapLandmark>;

export function filterLandmarks(
  options: readonly LandmarkOption[],
  search: string,
  selected: string,
) {
  const query = search.trim().normalize('NFC').toLowerCase();
  return options.filter(({ id, searchable }) => id === selected || searchable.includes(query));
}

export function readRideInput(values: RideFormValues, stands: readonly PickupStand[]) {
  const { from, to, passengers, when, date } = values;
  const stand = stands.find(({ pickupLandmarkIds }) => pickupLandmarkIds.some((id) => id === from));
  if (!stand || !to || from === to) return { ok: false, error: 'noRoute' } as const;

  const pickupAtEpochMilliseconds =
    when === 'later' ? Date.parse(`${date}${INDIA_UTC_OFFSET}`) : undefined;
  if (
    pickupAtEpochMilliseconds !== undefined &&
    (!Number.isFinite(pickupAtEpochMilliseconds) || pickupAtEpochMilliseconds <= Date.now())
  ) {
    return { ok: false, error: 'invalidDate' } as const;
  }
  return {
    ok: true,
    standId: stand.id,
    input: {
      pickupLandmarkId: from,
      destinationLandmarkId: to,
      passengers,
      ...(pickupAtEpochMilliseconds === undefined ? {} : { pickupAtEpochMilliseconds }),
    },
  } as const;
}
