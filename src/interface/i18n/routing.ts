import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['mr', 'en', 'hi'],
  defaultLocale: 'mr',
  localePrefix: 'always',
  localeDetection: false,
  localeCookie: false,
});
