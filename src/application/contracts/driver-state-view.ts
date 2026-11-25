import type { BookingId, DriverId, RideOfferId } from '@domain/shared/ids.value-object';
import type { Translations } from './town-overview-view';

export interface DriverLabel {
  readonly name: string;
  readonly names?: Translations | undefined;
}

export interface DriverOfferView {
  readonly offerId: RideOfferId;
  readonly pickup: DriverLabel | null;
  readonly pickupCue: string;
  readonly pickupCueTranslations?: Translations | undefined;
  readonly expiresAtEpochMilliseconds: number;
}

export interface DriverTripView {
  readonly bookingId: BookingId;
  readonly status: 'accepted' | 'driver_arrived' | 'in_trip';
  readonly destination: DriverLabel | null;
  readonly fareInPaise: number;
  readonly rider: { readonly firstName?: string; readonly phone: string } | null;
}

export interface DriverStateView {
  readonly driverId: DriverId;
  readonly stand: DriverLabel | null;
  readonly availability: 'online' | 'offline';
  readonly queuePosition: number | null;
  readonly needsRejoin: boolean;
  readonly trip: DriverTripView | null;
}
