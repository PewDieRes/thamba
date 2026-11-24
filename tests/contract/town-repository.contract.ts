import type { TownRepository } from '@application/ports/town-repository';
import { expect, test } from 'vitest';
import { DEMO_TOWN, MALVAN_TOWN, TOWN } from '../unit/application/demo-data.fixtures';
import {
  CONFLICT,
  SAVED,
  type AdapterFactory,
  versionedRepositoryContract,
} from './versioned-repository.fixtures';

export function townRepositoryContract(make: AdapterFactory<TownRepository>) {
  versionedRepositoryContract({
    name: 'TownRepository',
    make,
    id: TOWN,
    first: DEMO_TOWN,
    updated: { ...DEMO_TOWN, grievanceContact: 'Updated grievance contact' },
  });
  test('TownRepository resolves unique public slugs', async () => {
    const repo = await make();
    expect(await repo.save(DEMO_TOWN, null)).toEqual(SAVED);
    expect(await repo.save({ ...MALVAN_TOWN, slug: DEMO_TOWN.slug }, null)).toEqual(CONFLICT);
    expect(await repo.findBySlug(DEMO_TOWN.slug)).toEqual({ version: 1, value: DEMO_TOWN });
    expect(await repo.findBySlug(MALVAN_TOWN.slug)).toBeUndefined();
  });
}
