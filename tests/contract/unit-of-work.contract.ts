import { describe, expect, test } from 'vitest';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { DEMO_STAND, DEMO_TOWN, STAND, TOWN } from '../unit/application/demo-data.fixtures';
import { CONFLICT, SAVED, type AdapterFactory } from './versioned-repository.fixtures';

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
        expect(await towns.save(DEMO_TOWN, null)).toEqual(SAVED);
        expect(await stands.save(DEMO_STAND, null)).toEqual(SAVED);
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
        expect(await towns.save(DEMO_TOWN, null)).toEqual(SAVED);
        return stands.save(DEMO_STAND, null);
      }),
    ).toEqual(SAVED);
    expect(await read()).toEqual(
      ok([
        { value: DEMO_TOWN, version: 1 },
        { value: DEMO_STAND, version: 1 },
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
      const saved = await towns.save({ ...DEMO_TOWN, name: 'Other name' }, null);
      ready.resolve();
      if (!saved.ok) return saved;
      await resume.promise;
      return stands.save(DEMO_STAND, null);
    });
    await ready.promise;
    const faster = await unit.run(({ towns }) => towns.save(DEMO_TOWN, null));
    resume.resolve();
    expect(faster).toEqual(SAVED);
    expect(await slower).toEqual(CONFLICT);
    expect(
      await unit.run(async ({ towns, stands }) =>
        ok([await towns.get(TOWN), await stands.get(STAND)]),
      ),
    ).toEqual(ok([{ value: DEMO_TOWN, version: 1 }, undefined]));
  });
}

function latch() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: release };
}
