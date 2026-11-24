import type { DriverInvite } from '@domain/identity/driver-invite';
import type { DriverId, StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';

export interface ScopedDriverInvite extends BookingScope {
  readonly standId: StandId;
  readonly invite: DriverInvite;
}
import type { WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface DriverInviteRepository {
  get(id: DriverInvite['tokenHash']): Promise<Versioned<ScopedDriverInvite> | undefined>;
  listIssuedByDriver(driverId: DriverId): Promise<readonly Versioned<ScopedDriverInvite>[]>;
  save(value: ScopedDriverInvite, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
