import type { ScopedDriverInvite } from '@application/ports/driver-invite-repository';
import type { DriverInvite } from '@domain/identity/driver-invite';
import type { Tables } from './database.types';
import type { DomainValues } from './domain-values';
import { readInstant, readScope, versioned, writeInstant, writeRunScope } from './row.mapper';

export type DriverInviteRow = Pick<
  Tables<'driver_invites'>,
  | 'town_id'
  | 'run_scope_id'
  | 'stand_id'
  | 'driver_id'
  | 'token_hash'
  | 'status'
  | 'expires_at'
  | 'redeemed_at'
  | 'revoked_at'
  | 'version'
>;

function readInvite(row: DriverInviteRow, domain: DomainValues): DriverInvite {
  const details = {
    driverId: row.driver_id as DriverInvite['driverId'],
    tokenHash: row.token_hash as DriverInvite['tokenHash'],
    expiresAt: readInstant(row.expires_at, domain),
  };
  if (row.redeemed_at !== null) {
    return { ...details, status: 'redeemed', redeemedAt: readInstant(row.redeemed_at, domain) };
  }
  if (row.revoked_at !== null) {
    return { ...details, status: 'revoked', revokedAt: readInstant(row.revoked_at, domain) };
  }
  return { ...details, status: row.status === 'expired' ? 'expired' : 'issued' };
}

export function fromDriverInviteRow(row: DriverInviteRow, domain: DomainValues) {
  return versioned<ScopedDriverInvite>(row, {
    ...readScope(row.town_id, row.run_scope_id),
    standId: row.stand_id as ScopedDriverInvite['standId'],
    invite: readInvite(row, domain),
  });
}

export function toDriverInviteRow(value: ScopedDriverInvite): Omit<DriverInviteRow, 'version'> {
  const { invite } = value;
  return {
    ...writeRunScope(value),
    stand_id: value.standId,
    driver_id: invite.driverId,
    token_hash: invite.tokenHash,
    status: invite.status,
    expires_at: new Date(invite.expiresAt.epochMilliseconds).toISOString(),
    redeemed_at: writeInstant(invite.status === 'redeemed' ? invite.redeemedAt : undefined),
    revoked_at: writeInstant(invite.status === 'revoked' ? invite.revokedAt : undefined),
  };
}
