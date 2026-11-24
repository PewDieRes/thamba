import type { DriverId } from '@domain/shared/ids.value-object';
import type {
  DriverInviteRepository,
  ScopedDriverInvite,
} from '@application/ports/driver-invite-repository';
import type { WriteResult } from '@application/ports/application-result';
import type { ExpectedVersion } from '@application/ports/versioned';
import { MemoryTable } from './memory-table';

export class InMemoryDriverInviteRepository implements DriverInviteRepository {
  constructor(private readonly table = new MemoryTable<ScopedDriverInvite>()) {}

  get(id: ScopedDriverInvite['invite']['tokenHash']) {
    return Promise.resolve(this.table.get(id));
  }

  listIssuedByDriver(driverId: DriverId) {
    return Promise.resolve(
      this.table
        .list()
        .filter(
          ({ value: { invite } }) => invite.driverId === driverId && invite.status === 'issued',
        ),
    );
  }

  save(value: ScopedDriverInvite, expectedVersion: ExpectedVersion): Promise<WriteResult> {
    const id = value.invite.tokenHash;
    return Promise.resolve(this.table.save(id, value, expectedVersion));
  }
}
