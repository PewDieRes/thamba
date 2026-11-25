import type { RiderBookingReader } from '@application/ports/rider-booking-reader';
import type { ActorContext } from '@application/ports/actor-context';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { Sql } from 'postgres';
import { fromRiderBookingRow, type RiderBookingRow } from './booking.mapper';
import type { DomainValues } from './domain-values';
import { UNAVAILABLE } from './repository-storage';

export class PostgresRiderBookingReader implements RiderBookingReader {
  constructor(
    private readonly sql: Sql,
    private readonly actors: ActorContext,
    private readonly domain: DomainValues,
  ) {}

  async get(bookingId: BookingId) {
    try {
      const actor = await this.actors.getActor();
      if (actor?.kind !== 'anonymous') return { ok: true as const, value: undefined };
      const [row] = await this.sql<{ booking: RiderBookingRow | null }[]>`
        select public.thamba_get_rider_booking(${bookingId}, ${actor.subject}) as booking
      `;
      const booking = row?.booking ? fromRiderBookingRow(row.booking, this.domain) : undefined;
      return { ok: true as const, value: booking };
    } catch {
      return UNAVAILABLE;
    }
  }
}
