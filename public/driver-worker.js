/* global self, caches */
const CACHE_PREFIX = 'thamba-driver-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const ICONS = ['/driver-pwa/icon-192.png', '/driver-pwa/icon-512.png'];
const SHELL = {
  '/mr/driver': '/driver-pwa/offline-mr.html',
  '/en/driver': '/driver-pwa/offline-en.html',
  '/hi/driver': '/driver-pwa/offline-hi.html',
};

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(activateShell());
});

self.addEventListener('fetch', (event) => {
  const shell = getOfflineShell(event.request);
  if (shell) event.respondWith(loadDriverHome(event.request, shell));
});

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  // The install list contains only public files. Runtime responses never enter Cache Storage.
  await cache.addAll(
    [...Object.values(SHELL), ...ICONS].map(
      (path) =>
        new Request(new URL(path, self.location.origin), {
          credentials: 'omit',
          redirect: 'error',
          cache: 'reload',
        }),
    ),
  );
}

async function activateShell() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  );
  await self.clients.claim();
}

function getOfflineShell(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate') return undefined;
  if (url.origin !== self.location.origin || url.search) return undefined;
  return Object.hasOwn(SHELL, url.pathname) ? SHELL[url.pathname] : undefined;
}

async function loadDriverHome(request, shell) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(new URL(shell, self.location.origin))) ?? Response.error();
  }
}
