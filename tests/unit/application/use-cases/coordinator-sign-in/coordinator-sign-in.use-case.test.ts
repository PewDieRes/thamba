import { expect, test, vi } from 'vitest';
import { buildCoordinatorSignIn } from '@infrastructure/composition/container';

test('returns the same result without sending a link when membership is missing', async () => {
  const sendCoordinatorLink = vi.fn();
  const { requestLink } = buildCoordinatorSignIn({
    session: { sendCoordinatorLink },
    directory: { isActiveCoordinator: () => Promise.resolve({ ok: true, value: false }) },
  });
  const result = await requestLink.execute({
    email: 'observer@example.com',
    callback: 'https://example.com/auth/callback',
  });
  expect(result).toMatchObject({ ok: true });
  expect(sendCoordinatorLink).not.toHaveBeenCalled();
});

test('delivers the link for a confirmed, operator-provisioned Coordinator', async () => {
  const sendCoordinatorLink = vi.fn(() => Promise.resolve({ ok: true as const, value: undefined }));
  const directory = {
    isActiveCoordinator: vi.fn(() => Promise.resolve({ ok: true as const, value: true })),
  };
  const { requestLink } = buildCoordinatorSignIn({ session: { sendCoordinatorLink }, directory });
  const callback = 'https://example.com/auth/callback?locale=mr';
  expect(await requestLink.execute({ email: 'Coordinator@Example.com', callback })).toMatchObject({
    ok: true,
  });
  expect(directory.isActiveCoordinator).toHaveBeenCalledExactlyOnceWith('coordinator@example.com');
  expect(sendCoordinatorLink).toHaveBeenCalledExactlyOnceWith('coordinator@example.com', callback);
});

test('fails closed when the Coordinator directory is unavailable', async () => {
  const sendCoordinatorLink = vi.fn();
  const { requestLink } = buildCoordinatorSignIn({
    session: { sendCoordinatorLink },
    directory: {
      isActiveCoordinator: () =>
        Promise.resolve({ ok: false, error: { code: 'storage_unavailable' } }),
    },
  });
  const result = await requestLink.execute({
    email: 'coordinator@example.com',
    callback: 'https://example.com/auth/callback',
  });
  expect(result).toEqual({ ok: false, error: { code: 'storage_unavailable' } });
  expect(sendCoordinatorLink).not.toHaveBeenCalled();
});
