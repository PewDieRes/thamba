import type { MetadataRoute } from 'next';
import { routing } from '../interface/i18n/routing';
import commonMessages from '../../messages/mr/common.json';
import driverMessages from '../../messages/mr/driver.json';

export default function manifest(): MetadataRoute.Manifest {
  const driverHome = `/${routing.defaultLocale}/driver`;
  return {
    id: driverHome,
    name: `${commonMessages.appName} · ${driverMessages.home.title}`,
    short_name: commonMessages.appName,
    lang: routing.defaultLocale,
    start_url: driverHome,
    scope: driverHome,
    display: 'standalone',
    background_color: '#f4f1e8',
    theme_color: '#004631',
    icons: [
      { src: '/driver-pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/driver-pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
