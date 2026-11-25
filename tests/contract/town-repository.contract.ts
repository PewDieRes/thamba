import type { TownRepository } from '@application/ports/town-repository';
import { expect, test } from 'vitest';
import { DEMO_TOWN, MALVAN_TOWN, TOWN } from '../unit/application/demo-data.fixtures';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

const demoTown = { ...DEMO_TOWN, slug: 'repository-contract-demo-town' };
const malvan = { ...MALVAN_TOWN, slug: 'repository-contract-malvan' };

export function townRepositoryContract(make: AdapterFactory<TownRepository>) {
  versionedRepositoryContract({
    name: 'TownRepository',
    make,
    id: TOWN,
    first: demoTown,
    updated: { ...demoTown, grievanceContact: 'Updated grievance contact' },
  });
  test('TownRepository resolves unique public slugs', async () => {
    const repo = await make();
    expect(await repo.save(demoTown, null)).toEqual(SAVED);
    expect(await repo.save({ ...malvan, slug: demoTown.slug }, null)).toEqual(CONFLICT);
    expect(await repo.findBySlug(demoTown.slug)).toEqual({ version: 1, value: demoTown });
    expect(await repo.findBySlug(malvan.slug)).toBeUndefined();
  });
}
