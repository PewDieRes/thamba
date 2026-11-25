import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test, vi } from 'vitest';

const origin = 'https://thamba.example';
const offlinePath = '/driver-pwa/offline-mr.html';
const offlineResponse = new Response('Static offline shell');

function startWorker() {
  const cache = { addAll: vi.fn(), match: vi.fn(() => offlineResponse), put: vi.fn() };
  const caches = { open: vi.fn(() => cache), keys: vi.fn(() => []), delete: vi.fn() };
  const fetch = vi.fn();
  const listeners = new Map<string, (event: object) => void>();
  const worker = readFileSync('public/driver-worker.js', 'utf8');
  runInNewContext(worker, {
    self: {
      addEventListener: (name: string, listener: (event: object) => void) =>
        listeners.set(name, listener),
      location: { origin },
    },
    caches,
    fetch,
    Request,
    Response,
    URL,
  });
  return { cache, fetch, listeners };
}

test('precaches only the enumerated public shell and icon requests without credentials', async () => {
  const { cache, listeners } = startWorker();
  const waitUntil = vi.fn<(done: Promise<void>) => void>();
  listeners.get('install')?.({ waitUntil });
  expect(waitUntil).toHaveBeenCalledOnce();
  await waitUntil.mock.lastCall?.[0];
  const [requests] = cache.addAll.mock.lastCall as [Request[]];
  expect([...requests].map(({ url }) => new URL(url).pathname)).toEqual([
    offlinePath,
    '/driver-pwa/offline-en.html',
    '/driver-pwa/offline-hi.html',
    '/driver-pwa/icon-192.png',
    '/driver-pwa/icon-512.png',
  ]);
  expect(
    [...requests].every(
      ({ method, credentials, redirect }) =>
        method === 'GET' && credentials === 'omit' && redirect === 'error',
    ),
  ).toBe(true);
});

test('bypasses APIs, invite and Rider pages, cross-origin requests and framework data', () => {
  const { cache, fetch, listeners } = startWorker();
  const respondWith = vi.fn();
  for (const [url, method, mode] of [
    [`${origin}/api/driver/pending-offer`, 'POST', 'cors'],
    [`${origin}/api/driver/state`, 'GET', 'navigate'],
    [`${origin}/api/driver/complete`, 'POST', 'cors'],
    [`${origin}/mr/driver/invite`, 'GET', 'navigate'],
    [`${origin}/mr/rider/status/booking`, 'GET', 'navigate'],
    [`${origin}/mr/driver?_rsc=flight`, 'GET', 'cors'],
    [`${origin}/mr/driver`, 'GET', 'cors'],
    ['https://other.example/mr/driver', 'GET', 'navigate'],
  ])
    listeners.get('fetch')?.({ request: { url, method, mode }, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(cache.put).not.toHaveBeenCalled();
});

test('uses a static fallback for failed home navigation and never stores network responses', async () => {
  const { cache, fetch, listeners } = startWorker();
  const respondWith = vi.fn<(response: Promise<Response>) => void>();
  const request = { url: `${origin}/mr/driver`, method: 'GET', mode: 'navigate' };
  const privateResponse = new Response('Network response');
  fetch.mockResolvedValueOnce(privateResponse).mockRejectedValueOnce(new Error('offline'));
  listeners.get('fetch')?.({ request, respondWith });
  expect(await respondWith.mock.lastCall?.[0]).toBe(privateResponse);
  expect(fetch).toHaveBeenCalledWith(request, { cache: 'no-store' });
  expect(cache.match).not.toHaveBeenCalled();
  listeners.get('fetch')?.({ request, respondWith });
  expect(await respondWith.mock.lastCall?.[0]).toBe(offlineResponse);
  expect(cache.match).toHaveBeenCalledWith(new URL(offlinePath, origin));
  expect(cache.put).not.toHaveBeenCalled();
});
