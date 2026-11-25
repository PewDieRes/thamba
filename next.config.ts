import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  headers: async () =>
    Promise.resolve([
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
