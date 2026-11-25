import type {
  DriverInviteRepository,
  ScopedDriverInvite,
} from '@application/ports/driver-invite-repository';
import type { ExpectedVersion } from '@application/ports/versioned';
import type { DriverId } from '@domain/shared/ids.value-object';
import type { DomainValues } from './domain-values';
import { fromDriverInviteRow, toDriverInviteRow } from './driver-invite.mapper';
import { getRow, type RepositoryStorage } from './repository-storage';

export class SupabaseDriverInviteRepository implements DriverInviteRepository {
  constructor(
    private readonly storage: RepositoryStorage,
    private readonly domain: DomainValues,
  ) {}

  async get(id: ScopedDriverInvite['invite']['tokenHash']) {
    const row = await getRow(this.storage, 'invites', { token_hash: id });
    return row && fromDriverInviteRow(row, this.domain);
  }

  async listIssuedByDriver(driverId: DriverId) {
    const rows = await this.storage.list('invites', { driver_id: driverId, status: 'issued' });
    return rows.map((row) => fromDriverInviteRow(row, this.domain));
  }

  save(value: ScopedDriverInvite, expectedVersion: ExpectedVersion) {
    return this.storage.save({
      resource: 'invites',
      key: { token_hash: value.invite.tokenHash },
      row: toDriverInviteRow(value),
      expectedVersion,
    });
  }
}
