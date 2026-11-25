import { expect, test, vi } from 'vitest';
import { buildStartAnonymousSession } from '@infrastructure/composition/container';

test('starts an anonymous session for an empty, valid command', async () => {
  const ensureAnonymous = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }));
  const useCase = buildStartAnonymousSession({ ensureAnonymous });
  expect(await useCase.execute({})).toMatchObject({ ok: true });
  expect(ensureAnonymous).toHaveBeenCalledOnce();
});

test('rejects a caller-supplied subject before creating an Auth session', async () => {
  const ensureAnonymous = vi.fn();
  const useCase = buildStartAnonymousSession({ ensureAnonymous });
  expect(await useCase.execute({ subject: 'caller' })).toMatchObject({ ok: false });
  expect(ensureAnonymous).not.toHaveBeenCalled();
});
