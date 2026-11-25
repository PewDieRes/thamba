import { expect, test, vi } from 'vitest';
import { buildCompleteCoordinatorSignIn } from '@infrastructure/composition/container';
import { COORDINATOR, SCOPE, STAND, SUBJECT_ONE } from '../../demo-data.fixtures';

test('clears Auth after a successful exchange when no active membership exists', async () => {
  const clear = vi.fn(() => Promise.resolve());
  const useCase = buildCompleteCoordinatorSignIn({
    clear,
    exchangeCoordinatorCode: () => Promise.resolve({ ok: true, value: undefined }),
    getActor: () => Promise.resolve({ kind: 'coordinator', subject: SUBJECT_ONE, memberships: [] }),
  });
  expect(await useCase.execute({ code: 'fixture-code' })).toEqual({
    ok: false,
    error: { code: 'forbidden' },
  });
  expect(clear).toHaveBeenCalledOnce();
});

test('preserves the session for a Coordinator with an active membership', async () => {
  const clear = vi.fn();
  const useCase = buildCompleteCoordinatorSignIn({
    clear,
    exchangeCoordinatorCode: () => Promise.resolve({ ok: true, value: undefined }),
    getActor: () =>
      Promise.resolve({
        kind: 'coordinator',
        subject: SUBJECT_ONE,
        memberships: [{ ...SCOPE, standId: STAND, coordinatorId: COORDINATOR }],
      }),
  });
  expect(await useCase.execute({ code: 'fixture-code' })).toMatchObject({ ok: true });
  expect(clear).not.toHaveBeenCalled();
});

test('preserves the existing session when code exchange fails', async () => {
  const clear = vi.fn();
  const getActor = vi.fn();
  const useCase = buildCompleteCoordinatorSignIn({
    clear,
    getActor,
    exchangeCoordinatorCode: () => Promise.resolve({ ok: false, error: { code: 'forbidden' } }),
  });
  expect(await useCase.execute({ code: 'invalid-code' })).toMatchObject({ ok: false });
  expect(getActor).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
});
