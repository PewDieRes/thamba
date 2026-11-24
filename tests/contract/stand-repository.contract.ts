import type { StandRepository } from '@application/ports/stand-repository';
import { DEMO_STAND, STAND } from '../unit/application/demo-data.fixtures';
import { type AdapterFactory, versionedRepositoryContract } from './versioned-repository.fixtures';

export function standRepositoryContract(make: AdapterFactory<StandRepository>) {
  versionedRepositoryContract({
    name: 'StandRepository',
    make,
    id: STAND,
    first: DEMO_STAND,
    updated: { ...DEMO_STAND, coordinatorContact: 'Updated contact' },
  });
}
