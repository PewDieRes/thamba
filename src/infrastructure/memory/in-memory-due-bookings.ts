import type { DueBookings } from '@application/ports/due-bookings';
import type { Booking } from '@domain/dispatch/booking';
import type { getBookingDueAt } from '@domain/dispatch/booking-state';
import type { Instant } from '@domain/shared/instant.value-object';

export class InMemoryDueBookings implements DueBookings {
  constructor(
    private readonly list: () => readonly Booking[],
    private readonly getDueAt: typeof getBookingDueAt,
  ) {}

  listDue(now: Instant, limit: number) {
    const due = this.list().flatMap(({ state }) => {
      const at = this.getDueAt(state);
      return at && now.isAtOrAfter(at) ? [{ id: state.bookingId, at: at.epochMilliseconds }] : [];
    });
    const ids = due
      .sort((left, right) => left.at - right.at || left.id.localeCompare(right.id))
      .slice(0, limit)
      .map(({ id }) => id);
    return Promise.resolve({ ok: true as const, value: ids });
  }
}
