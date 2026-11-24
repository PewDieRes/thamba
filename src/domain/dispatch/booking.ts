import type { DriverId, RiderId } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { BookingDecision } from './booking-decision';
import { DISPATCH_ACTOR, getBookingEventContext } from './booking-events';
import type { BookingEvent } from './booking-events';
import {
  acceptBookingOffer,
  closeBookingOffer,
  endBookingOffering,
  issueBookingOffer,
} from './booking-offer-transition';
import type {
  AcceptOfferInput,
  CloseOfferInput,
  EndOfferingInput,
  IssueOfferInput,
} from './booking-offer-transition';
import {
  confirmBooking,
  getDispatchBlock,
  getDispatchWindow,
  getSchedule,
  isScheduleDue,
} from './booking-request';
import type {
  BookingAuthority,
  DispatchSettings,
  RequestBookingInput,
  ScheduleBookingInput,
} from './booking-request';
import type { BookingState, BookingTransitionError, NoDriverFoundReason } from './booking-state';
import { getBookingTransition } from './booking-status';
import type { BookingCommand } from './booking-status';
import {
  cancelBookingByDriver,
  cancelBookingByRider,
  recordTripProgress,
} from './booking-trip-transition';

export type { BookingTransitionError } from './booking-state';

type BookingTransition = Result<
  {
    readonly booking: Booking;
    readonly events: readonly BookingEvent[];
  },
  BookingTransitionError
>;

interface EndSearchInput extends BookingAuthority {
  readonly areStandsExhausted: boolean;
}

export class Booking {
  private constructor(readonly state: BookingState) {
    Object.freeze(state);
    Object.freeze(this);
  }

  static schedule(input: ScheduleBookingInput, now: Instant): BookingTransition {
    const confirmed = confirmBooking(input, now);
    if (!confirmed.ok) return confirmed;
    const schedule = getSchedule(input, now);
    if (!schedule.ok) return schedule;

    const context = getBookingEventContext(
      confirmed.value,
      { type: 'rider', riderId: input.riderId },
      now,
    );
    return ok({
      booking: new Booking({ ...confirmed.value, ...schedule.value, status: 'scheduled' }),
      events: [{ ...context, ...schedule.value, type: 'BookingScheduled' }],
    });
  }

  static request(input: RequestBookingInput, now: Instant): BookingTransition {
    const confirmed = confirmBooking(input, now);
    if (!confirmed.ok) return confirmed;
    const dispatch = getDispatchWindow(input.standId, input, now);
    if (!dispatch.ok) return dispatch;

    const context = getBookingEventContext(
      confirmed.value,
      { type: 'rider', riderId: input.riderId },
      now,
    );
    return ok({
      booking: new Booking({ ...confirmed.value, ...dispatch.value, status: 'requested' }),
      events: [{ ...context, type: 'BookingRequested' }],
    });
  }

  activate(input: BookingAuthority & DispatchSettings, now: Instant): BookingTransition {
    return this.#transition('activate', () => {
      if (!isScheduleDue(this.state, now)) return err({ code: 'schedule_not_due' });
      if (!input.canBook) return err({ code: 'booking_unavailable' });
      const dispatch = getDispatchWindow(this.state.standId, input, now);
      if (!dispatch.ok) return dispatch;

      const context = getBookingEventContext(this.state, DISPATCH_ACTOR, now);
      return ok({ changes: dispatch.value, events: [{ ...context, type: 'BookingRequested' }] });
    });
  }

  closeSchedule(input: BookingAuthority, now: Instant): BookingTransition {
    return this.#transition('closeSchedule', () => {
      if (!isScheduleDue(this.state, now)) return err({ code: 'schedule_not_due' });
      if (input.canBook) return err({ code: 'dispatch_still_open' });

      return this.#recordNoDriverFound('booking_unavailable', now);
    });
  }

  issueOffer(input: IssueOfferInput, now: Instant): BookingTransition {
    return this.#transition('issueOffer', () => issueBookingOffer(this.state, input, now));
  }

  closeOffer(input: CloseOfferInput, now: Instant): BookingTransition {
    return this.#transition('closeOffer', () => closeBookingOffer(this.state, input, now));
  }

  acceptOffer(input: AcceptOfferInput, now: Instant): BookingTransition {
    return this.#transition('acceptOffer', () => acceptBookingOffer(this.state, input, now));
  }

  reportArrival(driverId: DriverId, now: Instant): BookingTransition {
    return this.#transition('reportArrival', () =>
      recordTripProgress(this.state, { driverId, type: 'DriverArrived' }, now),
    );
  }

  confirmPickup(driverId: DriverId, now: Instant): BookingTransition {
    return this.#transition('confirmPickup', () =>
      recordTripProgress(this.state, { driverId, type: 'TripStarted' }, now),
    );
  }

  completeTrip(driverId: DriverId, now: Instant): BookingTransition {
    return this.#transition('completeTrip', () =>
      recordTripProgress(this.state, { driverId, type: 'TripCompleted' }, now),
    );
  }

  endSearch(input: EndSearchInput, now: Instant): BookingTransition {
    return this.#transition('endSearch', () => {
      const block = getDispatchBlock(this.state, input, now);
      if (block) return this.#recordNoDriverFound(block, now);
      if (input.areStandsExhausted) return this.#recordNoDriverFound('stands_exhausted', now);
      return err({ code: 'dispatch_still_open' });
    });
  }

  endOffering(input: EndOfferingInput, now: Instant): BookingTransition {
    return this.#transition('endOffering', () => endBookingOffering(this.state, input, now));
  }

  cancelByRider(riderId: RiderId, now: Instant): BookingTransition {
    return this.#transition('cancelByRider', () => cancelBookingByRider(this.state, riderId, now));
  }

  cancelByDriver(driverId: DriverId, now: Instant): BookingTransition {
    return this.#transition('cancelByDriver', () =>
      cancelBookingByDriver(this.state, driverId, now),
    );
  }

  #transition(command: BookingCommand, decide: () => BookingDecision): BookingTransition {
    const status = getBookingTransition(this.state.status, command);
    if (status === undefined) return err({ code: 'illegal_transition' });

    const decision = decide();
    if (!decision.ok) return decision;
    return ok({
      booking: new Booking({ ...this.state, ...decision.value.changes, status }),
      events: decision.value.events,
    });
  }

  #recordNoDriverFound(reason: NoDriverFoundReason, now: Instant): BookingDecision {
    const context = getBookingEventContext(this.state, DISPATCH_ACTOR, now);
    return ok({
      changes: { noDriverFoundReason: reason },
      events: [{ ...context, type: 'BookingNoDriverFound', reason }],
    });
  }
}
