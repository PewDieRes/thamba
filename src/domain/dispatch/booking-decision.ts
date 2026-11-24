import type { Result } from '../shared/result';
import type { BookingEvent } from './booking-events';
import type { BookingState, BookingTransitionError } from './booking-state';

type BookingChange = Partial<
  Pick<
    BookingState,
    'requestedAt' | 'dispatchDeadline' | 'searchStandIds' | 'offer' | 'trip' | 'noDriverFoundReason'
  >
>;

export type BookingDecision = Result<
  {
    readonly changes: BookingChange;
    readonly events: readonly BookingEvent[];
  },
  BookingTransitionError
>;
