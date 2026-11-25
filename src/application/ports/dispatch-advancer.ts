import type { BookingId } from '@domain/shared/ids.value-object';
import type { ApplicationResult } from './application-result';

export interface DispatchAdvancer {
  execute(input: { bookingId: BookingId }): Promise<ApplicationResult<unknown>>;
}
