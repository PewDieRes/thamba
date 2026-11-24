import type { BookingTransitionError } from '@domain/dispatch/booking';
import type { FareError } from '@domain/fares/quote-fare';
import type { DriverSessionError } from '@domain/identity/driver-device';
import type { Result } from '@domain/shared/result';

export type ConcurrencyConflict = { readonly code: 'ConcurrencyConflict' };
export type StorageError = ConcurrencyConflict | { readonly code: 'storage_unavailable' };

export type ApplicationError =
  | StorageError
  | BookingTransitionError
  | FareError
  | DriverSessionError
  | {
      readonly code:
        | 'invalid_input'
        | 'not_found'
        | 'idempotency_key_reused'
        | 'inconsistent_state'
        | 'driver_on_trip'
        | 'driver_slot_occupied'
        | 'invalid_expiry'
        | 'INVITE_EXPIRED'
        | 'INVITE_ALREADY_REDEEMED'
        | 'INVITE_REVOKED'
        | 'driver_already_bound'
        | 'session_already_bound'
        | 'quote_pickup_mismatch';
    }
  | {
      readonly code: 'stale_quote';
      readonly freshQuote?: import('../contracts/fare-quote-view').FareQuoteView;
    };

export type ApplicationResult<T> = Result<T, ApplicationError>;
export type WriteResult = Result<void, StorageError>;
