// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DriverFlow } from '@interface/routes/driver-flow';
import {
  copy,
  home,
  NOW_MILLISECONDS,
  OFFER_DURATION_MILLISECONDS,
  offer,
  trip,
} from './driver.fixtures';

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

const DEVICE_CLOCK_SKEW_MILLISECONDS = 60_000;

test.each([
  { offset: DEVICE_CLOCK_SKEW_MILLISECONDS, action: 'accept' },
  { offset: -DEVICE_CLOCK_SKEW_MILLISECONDS, action: 'decline' },
] as const)(
  'counts down and sends $action with device clock skew of $offset ms',
  async ({ offset, action }) => {
    const fetch = vi.fn<(path: string, request?: RequestInit) => Promise<Response>>((path) =>
      Promise.resolve(
        path.endsWith('/respond')
          ? Response.json({ code: 'offer_expired' }, { status: 409 })
          : Response.json(path.endsWith('/state') ? home : offer),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers({
      toFake: ['Date', 'performance', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });
    vi.setSystemTime(NOW_MILLISECONDS + offset);
    await act(() => {
      render(<DriverFlow copy={copy} locale="en" />);
      return Promise.resolve();
    });
    expect(screen.getByRole('timer').textContent).toBe('3');
    await act(async () => vi.advanceTimersByTimeAsync(OFFER_DURATION_MILLISECONDS - 1));
    expect(screen.getByRole('timer').textContent).toBe('1');
    expect(screen.queryByRole('alert')).toBeNull();
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: copy[action] }));
      return Promise.resolve();
    });
    const request = fetch.mock.calls.find(([path]) => path.endsWith('/respond'))?.[1];
    expect(request?.body).toContain('"action":"' + action + '"');
    expect(screen.getByRole('alert').textContent).toBe(copy.unavailable);
  },
);

test('starts the countdown while the Driver state response is still pending', async () => {
  vi.useFakeTimers({
    toFake: ['performance', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
  });
  let resolveState: ((response: Response) => void) | undefined;
  const state = new Promise<Response>((resolve) => {
    resolveState = resolve;
  });
  vi.stubGlobal('fetch', (path: string) =>
    path.endsWith('/state') ? state : Promise.resolve(Response.json(offer)),
  );
  await act(() => {
    render(<DriverFlow copy={copy} locale="en" />);
    return Promise.resolve();
  });
  await act(async () => vi.advanceTimersByTimeAsync(1_000));
  await act(() => {
    resolveState?.(Response.json(home));
    return Promise.resolve();
  });
  expect(screen.getByRole('timer').textContent).toBe('2');
});

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
