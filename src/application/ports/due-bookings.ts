import type { BookingId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { ApplicationResult } from './application-result';

export interface DueBookings {
  listDue(now: Instant, limit: number): Promise<ApplicationResult<readonly BookingId[]>>;
}
