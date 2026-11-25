import { expect, test } from 'vitest';
import { canIssueInvite } from '@domain/identity/driver-invite-eligibility';

const eligible = {
  bookingMode: 'simulated',
  hasSimulationProfile: true,
  isInDemoRun: true,
  isSynthetic: true,
  hasSlot: true,
  hasDevice: false,
  hasPendingOffer: false,
  hasActiveTrip: false,
} as const;

test.each([
  ['free synthetic Driver in a Demo Run', {}, { ok: true, value: undefined }],
  ['missing slot', { hasSlot: false }, { ok: false, error: { code: 'not_found' } }],
  [
    'non-synthetic Driver',
    { isSynthetic: false },
    { ok: false, error: { code: 'booking_unavailable' } },
  ],
  [
    'outside a Demo Run',
    { isInDemoRun: false },
    { ok: false, error: { code: 'booking_unavailable' } },
  ],
  [
    'live booking mode',
    { bookingMode: 'live' as const },
    { ok: false, error: { code: 'booking_unavailable' } },
  ],
  [
    'missing simulation profile',
    { hasSimulationProfile: false },
    { ok: false, error: { code: 'booking_unavailable' } },
  ],
  ['bound device', { hasDevice: true }, { ok: false, error: { code: 'driver_already_bound' } }],
  [
    'pending offer',
    { hasPendingOffer: true },
    { ok: false, error: { code: 'driver_slot_occupied' } },
  ],
  ['active Trip', { hasActiveTrip: true }, { ok: false, error: { code: 'driver_slot_occupied' } }],
  [
    'bound and occupied',
    { hasDevice: true, hasActiveTrip: true },
    { ok: false, error: { code: 'driver_already_bound' } },
  ],
] as const)('decides invitation eligibility for %s', (_, overrides, expected) => {
  expect(canIssueInvite({ ...eligible, ...overrides })).toEqual(expected);
});
