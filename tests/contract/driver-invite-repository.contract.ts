import type { DriverInviteRepository } from '@application/ports/driver-invite-repository';
import { expect, test } from 'vitest';
import type { ScopedDriverInvite } from '@application/ports/driver-invite-repository';
import { DEADLINE, TOKEN_HASH } from './contract-data.fixtures';
import { DRIVER_ONE, DRIVER_TWO, NOW, SCOPE, STAND } from '../unit/application/demo-data.fixtures';
import {
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const issued: ScopedDriverInvite = {
  ...SCOPE,
  standId: STAND,
  invite: { driverId: DRIVER_ONE, tokenHash: TOKEN_HASH, status: 'issued', expiresAt: DEADLINE },
};

export function driverInviteRepositoryContract(make: AdapterFactory<DriverInviteRepository>) {
  versionedRepositoryContract({
    name: 'DriverInviteRepository',
    make,
    id: TOKEN_HASH,
    first: issued,
    updated: { ...issued, invite: { ...issued.invite, status: 'redeemed', redeemedAt: NOW } },
  });
  test('DriverInviteRepository returns only outstanding invites for the Driver', async () => {
    const repo = await make();
    expect(await repo.save(issued, null)).toEqual(SAVED);
    expect(await repo.listIssuedByDriver(DRIVER_ONE)).toEqual([{ value: issued, version: 1 }]);
    expect(await repo.listIssuedByDriver(DRIVER_TWO)).toEqual([]);
    const revoked = {
      ...issued,
      invite: { ...issued.invite, status: 'revoked' as const, revokedAt: NOW },
    };
    expect(await repo.save(revoked, 1)).toEqual(SAVED);
    expect(await repo.listIssuedByDriver(DRIVER_ONE)).toEqual([]);
  });
}
