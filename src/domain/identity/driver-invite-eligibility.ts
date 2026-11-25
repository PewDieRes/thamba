import type { DomainError } from '../shared/domain.error';
import { err, ok, type Result } from '../shared/result';
import type { BookingMode } from '../town/town';

export interface DriverInviteScope {
  readonly bookingMode: BookingMode | null;
  readonly hasSimulationProfile: boolean;
  readonly isInDemoRun: boolean;
}

export interface DriverInviteFacts {
  readonly isSynthetic: boolean;
  readonly hasSlot: boolean;
  readonly hasDevice: boolean;
  readonly hasPendingOffer: boolean;
  readonly hasActiveTrip: boolean;
}

type DriverInviteError = DomainError<
  'not_found' | 'booking_unavailable' | 'driver_already_bound' | 'driver_slot_occupied'
>;

export function canIssueInvite(
  facts: DriverInviteFacts & DriverInviteScope,
): Result<void, DriverInviteError> {
  if (!facts.hasSlot) return err({ code: 'not_found' });
  if (
    !facts.isSynthetic ||
    !facts.isInDemoRun ||
    facts.bookingMode !== 'simulated' ||
    !facts.hasSimulationProfile
  ) {
    return err({ code: 'booking_unavailable' });
  }
  if (facts.hasDevice) return err({ code: 'driver_already_bound' });
  if (facts.hasPendingOffer || facts.hasActiveTrip) return err({ code: 'driver_slot_occupied' });
  return ok(undefined);
}
