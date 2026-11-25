import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  headers: async () =>
    Promise.resolve([
      {
        source: '/driver-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: '/:locale/driver',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/:locale/driver/invite',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ]),
};
const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');

export default withNextIntl(config);
