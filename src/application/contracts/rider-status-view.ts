import type { BookingState } from '@domain/dispatch/booking-state';
import type { TownOverviewView, Translations } from './town-overview-view';

export interface MatchedDriverView {
  readonly firstName: string;
  readonly names?: Translations;
  readonly vehicleNumber?: string;
  readonly phone?: string;
}

export interface RiderStatusView {
  readonly status: BookingState['status'];
  readonly noDriverFoundReason?: BookingState['noDriverFoundReason'];
  readonly grievanceContact?: string | undefined;
  readonly grievanceContacts?: Translations | undefined;
  readonly capability?: TownOverviewView['capability'] | undefined;
  readonly coordinatorContact?: string | undefined;
  readonly coordinatorContacts?: Translations | undefined;
  readonly standName?: string | undefined;
  readonly standNames?: Translations | undefined;
  readonly matchedDriver?: MatchedDriverView | undefined;
  readonly pickupAtEpochMilliseconds?: number | undefined;
}
