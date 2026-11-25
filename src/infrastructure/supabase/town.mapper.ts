import type { TownRecord } from '@application/ports/town-repository';
import type { BookingMode } from '@domain/town/town';
import type { Licence } from '@domain/town/licence';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import { mapOptional, unpack, versioned } from './row.mapper';

const MILLISECONDS_PER_DAY = 86_400_000;
const ISO_DATE_LENGTH = 10;
const KOLKATA_DATE = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type LicenceRow = Pick<
  Tables<'licences'>,
  'ulin' | 'issuing_authority' | 'valid_from_date' | 'valid_through_date'
>;
type DemoRunRow = Pick<Tables<'demo_runs'>, 'id' | 'rider_user_id'>;
type DemoRun = TownRecord['demoRuns'][number];

export type TownRow = Pick<
  Tables<'towns'>,
  | 'id'
  | 'slug'
  | 'name'
  | 'grievance_contact'
  | 'booking_mode'
  | 'schedule_lead_time_milliseconds'
  | 'dispatch_duration_milliseconds'
  | 'offer_timeout_milliseconds'
  | 'max_search_stands'
  | 'version'
> & { licence: LicenceRow | null; has_simulation_profile: boolean; demo_runs: DemoRunRow[] };

function readLicence(row: LicenceRow | null, domain: DomainValues) {
  if (!row) return undefined;
  return unpack(
    domain.licence({
      ulin: row.ulin,
      issuingAuthority: row.issuing_authority,
      validFromDate: row.valid_from_date,
      validThroughDate: row.valid_through_date,
    }),
  );
}

function readDuration(milliseconds: number | null, domain: DomainValues) {
  return milliseconds === null ? undefined : unpack(domain.duration(milliseconds));
}

export function fromTownRow(row: TownRow, domain: DomainValues) {
  const town = domain.town(
    {
      townId: row.id as TownRecord['town']['townId'],
      licence: readLicence(row.licence, domain),
      simulationProfile: row.has_simulation_profile ? { kind: 'synthetic' } : undefined,
    },
    row.booking_mode as BookingMode,
  );
  return versioned<TownRecord>(row, {
    town,
    slug: row.slug,
    name: row.name,
    grievanceContact: row.grievance_contact,
    demoRuns: row.demo_runs.map(({ id, rider_user_id }) => ({
      demoRunId: id as DemoRun['demoRunId'],
      riderId: rider_user_id as DemoRun['riderId'],
    })),
    ...mapOptional('scheduleLeadTime', readDuration(row.schedule_lead_time_milliseconds, domain)),
    ...mapOptional('dispatchDuration', readDuration(row.dispatch_duration_milliseconds, domain)),
    ...mapOptional('offerTimeout', readDuration(row.offer_timeout_milliseconds, domain)),
    ...mapOptional('maxSearchStands', row.max_search_stands),
  });
}

function formatKolkataDate(milliseconds: number): string {
  const parts = Object.fromEntries(
    KOLKATA_DATE.formatToParts(milliseconds).map(({ type, value }) => [type, value]),
  );
  const { year, month, day } = parts;
  if (!year || !month || !day) throw new Error('Invalid licence date');
  return new Date(`${year.padStart(4, '0')}-${month}-${day}T00:00:00Z`)
    .toISOString()
    .slice(0, ISO_DATE_LENGTH);
}

function writeLicence(licence: Licence | undefined): LicenceRow | null {
  if (!licence) return null;
  return {
    ulin: licence.ulin,
    issuing_authority: licence.issuingAuthority,
    valid_from_date: formatKolkataDate(licence.startsAt.epochMilliseconds),
    valid_through_date: formatKolkataDate(licence.endsAt.epochMilliseconds - MILLISECONDS_PER_DAY),
  };
}

export function toTownRow(value: TownRecord): Omit<TownRow, 'version'> {
  return {
    id: value.town.townId,
    slug: value.slug,
    name: value.name,
    grievance_contact: value.grievanceContact,
    booking_mode: value.town.bookingMode,
    licence: writeLicence(value.town.licence),
    has_simulation_profile: value.town.simulationProfile !== undefined,
    demo_runs: value.demoRuns.map(({ demoRunId, riderId }) => ({
      id: demoRunId,
      rider_user_id: riderId,
    })),
    schedule_lead_time_milliseconds: value.scheduleLeadTime?.milliseconds ?? null,
    dispatch_duration_milliseconds: value.dispatchDuration?.milliseconds ?? null,
    offer_timeout_milliseconds: value.offerTimeout?.milliseconds ?? null,
    max_search_stands: value.maxSearchStands ?? null,
  };
}
