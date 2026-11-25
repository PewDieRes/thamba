import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import {
  fromDriverInviteRow,
  toDriverInviteRow,
} from '@infrastructure/supabase/driver-invite.mapper';
import { TOKEN_HASH, DEADLINE } from '../../../contract/contract-data.fixtures';
import { SCOPE, STAND, DRIVER_ONE, NOW } from '../../application/demo-data.fixtures';

test('round trips the driver invite row with its storage version', () => {
  const record = {
    ...SCOPE,
    standId: STAND,
    invite: {
      driverId: DRIVER_ONE,
      tokenHash: TOKEN_HASH,
      expiresAt: DEADLINE,
      status: 'redeemed' as const,
      redeemedAt: NOW,
    },
  };
  const row = { ...toDriverInviteRow(record), version: 4 };
  const restored = fromDriverInviteRow(row, domainValues);
  expect(restored).toEqual({ value: record, version: 4 });
  expect(row.token_hash).toBe(TOKEN_HASH);
});
