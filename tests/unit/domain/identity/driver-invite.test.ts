import { expect, expectTypeOf, it } from 'vitest';
import { createInviteTokenHash, redeemInvite } from '@domain/identity/driver-invite';
import type { DriverInvite } from '@domain/identity/driver-invite';
import { createSessionSubject } from '@domain/shared/ids.value-object';
import { err } from '@domain/shared/result';
import { at, driverId, unwrap } from '../dispatch/booking.fixtures';

const subject = unwrap(createSessionSubject('00000000-0000-0000-0000-000000000101'));
const otherSubject = unwrap(createSessionSubject('00000000-0000-0000-0000-000000000102'));
const expiresAt = at(10);
const issued: DriverInvite = {
  status: 'issued',
  driverId,
  tokenHash: unwrap(createInviteTokenHash('a'.repeat(64))),
  expiresAt,
};

it('stores only a validated token hash', () => {
  expect(createInviteTokenHash('synthetic-raw-invite-token').ok).toBe(false);
  expectTypeOf<Extract<keyof DriverInvite, 'token' | 'rawToken'>>().toEqualTypeOf<never>();
  const inviteWithExtraField = { ...issued, rawToken: 'synthetic-raw-token' };
  const result = unwrap(redeemInvite(inviteWithExtraField, subject, at(9)));
  expect(result.invite).not.toHaveProperty('rawToken');
  expect(result.device).not.toHaveProperty('tokenHash');
});

it('redeems immediately before expiry and binds the Driver to the session subject', () => {
  const now = at(9);
  const result = unwrap(redeemInvite(issued, subject, now));
  expect(result.invite).toEqual({ ...issued, status: 'redeemed', redeemedAt: now });
  expect(result.device).toEqual({ driverId, subject, status: 'active', boundAt: now });
  expect(issued.status).toBe('issued');
});

it.each([10, 11])('rejects the issued invite at %i ms', (milliseconds) => {
  expect(redeemInvite(issued, subject, at(milliseconds))).toEqual(err({ code: 'INVITE_EXPIRED' }));
});

it('rejects reuse by either the same or another session even after expiry', () => {
  const { invite } = unwrap(redeemInvite(issued, subject, at(9)));
  expect(redeemInvite(invite, subject, at(9))).toEqual(err({ code: 'INVITE_ALREADY_REDEEMED' }));
  expect(redeemInvite(invite, otherSubject, at(11))).toEqual(
    err({ code: 'INVITE_ALREADY_REDEEMED' }),
  );
});

it('respects recorded revocation and expiry', () => {
  const revoked = { ...issued, status: 'revoked', revokedAt: at(8) } as const;
  const expired = { ...issued, status: 'expired' } as const;
  expect(redeemInvite(revoked, subject, at(9))).toEqual(err({ code: 'INVITE_REVOKED' }));
  expect(redeemInvite(expired, subject, at(9))).toEqual(err({ code: 'INVITE_EXPIRED' }));
});
