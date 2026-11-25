import type {
  BookingId,
  DemoRunId,
  FareQuoteId,
  RideOfferId,
  StandId,
  TownId,
} from '@domain/shared/ids.value-object';
import type { DriverInvite } from '@domain/identity/driver-invite';

export type RepositoryTarget =
  | { readonly kind: 'town'; readonly townId: TownId; readonly demoRunId?: DemoRunId | undefined }
  | { readonly kind: 'catalog'; readonly slug: string }
  | { readonly kind: 'quote'; readonly quoteId: FareQuoteId }
  | {
      readonly kind: 'rider_booking' | 'driver_booking' | 'sweep_booking';
      readonly bookingId: BookingId;
    }
  | { readonly kind: 'offer'; readonly offerId: RideOfferId }
  | { readonly kind: 'stand'; readonly standId: StandId }
  | { readonly kind: 'device' }
  | { readonly kind: 'invite'; readonly tokenHash: DriverInvite['tokenHash'] };

export interface RepositoryAccess {
  readonly target: RepositoryTarget;
  readonly command?: { readonly actor: string; readonly key: string | undefined };
}
