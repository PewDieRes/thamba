// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DriverFlow } from '@interface/routes/driver-flow';
import { copy, home, NOW_MILLISECONDS, offer, trip } from './driver.fixtures';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test.each([
  { action: 'accept', body: { code: 'offer_expired' }, status: 409, notice: copy.unavailable },
  { action: 'decline', body: { status: 'requested' }, status: 200, notice: null },
] as const)(
  'removes a resolved offer after $action and shows any expiry notice',
  async ({ action, body, status, notice }) => {
    const fetch = vi.fn((path: string) =>
      Promise.resolve(
        path.endsWith('/respond')
          ? Response.json(body, { status })
          : Response.json(path.endsWith('/state') ? home : offer),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MILLISECONDS);
    await act(() => {
      render(<DriverFlow copy={copy} locale="en" />);
      return Promise.resolve();
    });
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: copy[action] }));
      return Promise.resolve();
    });
    expect(screen.queryByRole('alert')?.textContent ?? null).toBe(notice);
    expect(screen.queryByRole('region', { name: copy.offer })).toBeNull();
  },
);

test('polls after three seconds and recovers the current Trip immediately on reconnect', async () => {
  let state = home;
  const fetch = vi.fn((path: string) =>
    Promise.resolve(Response.json(path.endsWith('/state') ? state : null)),
  );
  vi.stubGlobal('fetch', fetch);
  vi.useFakeTimers();
  await act(() => {
    render(<DriverFlow copy={copy} locale="en" />);
    return Promise.resolve();
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(2_999));
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(fetch).toHaveBeenCalledTimes(4);
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
  expect(screen.getByText(copy.disconnected)).toBeTruthy();
  state = { ...home, trip };
  await act(() => {
    window.dispatchEvent(new Event('online'));
    return Promise.resolve();
  });
  expect(screen.getByRole('heading', { name: copy.accepted })).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(6);
});
