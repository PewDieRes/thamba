import type { Result } from '../shared/result';
import type { Trip } from '../trip/trip';
import type { OfflineDriverQueueEntry } from './driver-queue-entry';
import type { BookingEvent } from './booking-events';
import type { BookingState, BookingTransitionError } from './booking-state';

type BookingChange = Partial<
  Pick<
    BookingState,
    'requestedAt' | 'dispatchDeadline' | 'searchStandIds' | 'offer' | 'noDriverFoundReason'
  >
>;

export interface BookingEffects {
  readonly events: readonly BookingEvent[];
  readonly trip?: Trip;
  readonly queueEntry?: OfflineDriverQueueEntry;
}

export type BookingDecision = Result<
  {
    readonly changes: BookingChange;
  } & BookingEffects,
  BookingTransitionError
>;
