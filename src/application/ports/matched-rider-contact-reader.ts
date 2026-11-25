import type { BookingId, SessionSubject } from '@domain/shared/ids.value-object';
import type { ApplicationResult } from './application-result';

export interface MatchedRiderContact {
  readonly firstName?: string;
  readonly phone: string;
}

export interface MatchedRiderContactReader {
  get(input: {
    bookingId: BookingId;
    subject: SessionSubject;
  }): Promise<ApplicationResult<MatchedRiderContact | null>>;
}
