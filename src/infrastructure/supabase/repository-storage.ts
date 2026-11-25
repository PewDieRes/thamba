import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingRow } from './booking.mapper';
import type { CommandLogRow } from './command-log.mapper';
import type { Database, Json } from './database.types';
import type { DriverDeviceRow } from './driver-device.mapper';
import type { DriverInviteRow } from './driver-invite.mapper';
import type { DriverQueueRow } from './driver-queue.mapper';
import type { EventLogRow } from './event-log.mapper';
import type { FareChartRow } from './fare-chart.mapper';
import type { FareQuoteRow } from './fare-quote.mapper';
import type { RideOfferRow } from './ride-offer.mapper';
import type { StandRow } from './stand.mapper';
import type { TownRow } from './town.mapper';
import type { TripRow } from './trip.mapper';

interface Rows {
  bookings: BookingRow;
  offers: RideOfferRow;
  queue: DriverQueueRow;
  stands: StandRow;
  towns: TownRow;
  charts: FareChartRow;
  quotes: FareQuoteRow;
  trips: TripRow;
  invites: DriverInviteRow;
  devices: DriverDeviceRow;
  commands: CommandLogRow;
  events: EventLogRow;
}

export type Resource = keyof Rows;
export type Row<Name extends Resource> = Rows[Name];
type FilterValue = string | null | readonly string[];
export type Filter = Readonly<Record<string, FilterValue>>;
export type Client = SupabaseClient<Database>;

export interface RowWrite {
  resource: Resource;
  key: Filter;
  row: Record<string, Json | undefined>;
  expectedVersion: ExpectedVersion;
}

export const SAVED = { ok: true, value: undefined } as const;
export const CONFLICT = { ok: false, error: { code: 'ConcurrencyConflict' } } as const;
export const UNAVAILABLE = { ok: false, error: { code: 'storage_unavailable' } } as const;

export class StorageFailure extends Error {
  constructor(readonly code: string | undefined) {
    super('Supabase repository operation failed');
  }
}

export function getWriteFailure(error: unknown): WriteResult {
  return error instanceof StorageFailure && ['23505', '40001', '40P01'].includes(error.code ?? '')
    ? CONFLICT
    : UNAVAILABLE;
}

export interface RepositoryStorage {
  list<Name extends Resource>(resource: Name, filter: Filter): Promise<Row<Name>[]>;
  save(write: RowWrite): Promise<WriteResult>;
}

export async function getRow<Name extends Resource>(
  storage: RepositoryStorage,
  resource: Name,
  filter: Filter,
): Promise<Row<Name> | undefined> {
  const [row] = await storage.list(resource, filter);
  return row;
}
