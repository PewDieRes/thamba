import type { DueBookings } from '@application/ports/due-bookings';
import type { BookingId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { Sql } from 'postgres';
import { UNAVAILABLE } from './repository-storage';

export class PostgresDueBookings implements DueBookings {
  constructor(private readonly sql: Sql) {}

  async listDue(now: Instant, limit: number) {
    try {
      const [row] = await this.sql<{ ids: BookingId[] }[]>`
        select public.thamba_due_booking_ids(${new Date(now.epochMilliseconds)}::timestamptz, ${limit}) as ids
      `;
      return row ? { ok: true as const, value: row.ids } : UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  }
}
