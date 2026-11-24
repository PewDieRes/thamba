import type { DomainError } from '../shared/domain.error';
import type { DriverId, SessionSubject } from '../shared/ids.value-object';
import type { Instant } from '../shared/instant.value-object';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import type { ActiveDriverDevice } from './driver-device';

const SHA_256_HEX = /^[0-9a-f]{64}$/i;
declare const INVITE_TOKEN_HASH: unique symbol;
type InviteTokenHash = string & { readonly [INVITE_TOKEN_HASH]: true };

interface InviteDetails {
  readonly driverId: DriverId;
  readonly tokenHash: InviteTokenHash;
  readonly expiresAt: Instant;
}

type RedeemedInvite = InviteDetails & { readonly status: 'redeemed'; readonly redeemedAt: Instant };

export type DriverInvite = InviteDetails &
  (
    | { readonly status: 'issued' }
    | RedeemedInvite
    | { readonly status: 'revoked'; readonly revokedAt: Instant }
    | { readonly status: 'expired' }
  );

type InviteRedemptionError = DomainError<
  'INVITE_EXPIRED' | 'INVITE_ALREADY_REDEEMED' | 'INVITE_REVOKED'
>;

interface InviteRedemption {
  readonly invite: RedeemedInvite;
  readonly device: ActiveDriverDevice;
}

export function createInviteTokenHash(
  input: unknown,
): Result<InviteTokenHash, DomainError<'invalid_invite_token_hash'>> {
  if (typeof input !== 'string' || !SHA_256_HEX.test(input)) {
    return err({ code: 'invalid_invite_token_hash' });
  }
  return ok(input.toLowerCase() as InviteTokenHash);
}

export function redeemInvite(
  invite: DriverInvite,
  subject: SessionSubject,
  now: Instant,
): Result<InviteRedemption, InviteRedemptionError> {
  if (invite.status === 'redeemed') return err({ code: 'INVITE_ALREADY_REDEEMED' });
  if (invite.status === 'revoked') return err({ code: 'INVITE_REVOKED' });
  if (invite.status === 'expired' || now.isAtOrAfter(invite.expiresAt)) {
    return err({ code: 'INVITE_EXPIRED' });
  }

  const { driverId, tokenHash, expiresAt } = invite;
  return ok({
    invite: Object.freeze({ driverId, tokenHash, expiresAt, status: 'redeemed', redeemedAt: now }),
    device: Object.freeze({ driverId, subject, status: 'active', boundAt: now }),
  });
}
