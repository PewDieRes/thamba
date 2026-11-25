import { describe, expect, test } from 'vitest';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { DEMO_STAND, DEMO_TOWN, STAND, TOWN } from '../unit/application/demo-data.fixtures';
import { CONFLICT, SAVED, type AdapterFactory } from './versioned-repository.fixtures';

const town = { ...DEMO_TOWN, slug: 'repository-contract-demo-town' };
const stand = { ...DEMO_STAND, pickupCues: {} };

export function unitOfWorkContract(make: AdapterFactory<UnitOfWork>) {
  describe('UnitOfWork', () => {
    registerCommitContract(make);
    registerConflictContract(make);
  });
}

function registerCommitContract(make: AdapterFactory<UnitOfWork>) {
  test('commits a successful decision and rolls back a rejected decision across ports', async () => {
    const unit = await make();
    const rejected = err({ code: 'booking_unavailable' as const });
    expect(
      await unit.run(async ({ towns, stands }) => {
        expect(await towns.save(town, null)).toEqual(SAVED);
        expect(await stands.save(stand, null)).toEqual(SAVED);
        return rejected;
      }),
    ).toEqual(rejected);
    const read = () =>
      unit.run(async ({ towns, stands }) =>
        ok(await Promise.all([towns.get(TOWN), stands.get(STAND)])),
      );
    expect(await read()).toEqual(ok([undefined, undefined]));
    expect(
      await unit.run(async ({ towns, stands }) => {
        expect(await towns.save(town, null)).toEqual(SAVED);
        return stands.save(stand, null);
      }),
    ).toEqual(SAVED);
    expect(await read()).toEqual(
      ok([
        { value: town, version: 1 },
        { value: stand, version: 1 },
      ]),
    );
  });
}

function registerConflictContract(make: AdapterFactory<UnitOfWork>) {
  test('concurrent writes conflict without exposing partial changes', async () => {
    const unit = await make();
    const ready = latch();
    const resume = latch();
    const slower = unit.run(async ({ towns, stands }) => {
      const saved = await towns.save({ ...town, name: 'Other name' }, null);
      ready.resolve();
      if (!saved.ok) return saved;
      await resume.promise;
      return stands.save(stand, null);
    });
    await ready.promise;
    const faster = await unit.run(({ towns }) => towns.save(town, null));
    resume.resolve();
    expect(faster).toEqual(SAVED);
    expect(await slower).toEqual(CONFLICT);
    expect(
      await unit.run(async ({ towns, stands }) =>
        ok([await towns.get(TOWN), await stands.get(STAND)]),
      ),
    ).toEqual(ok([{ value: town, version: 1 }, undefined]));
  });
}

function latch() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: release };
}
