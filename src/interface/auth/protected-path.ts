import { hasLocale } from 'next-intl';
import { routing } from '../i18n/routing';
import type { ProtectedArea } from './area-guard';

export function getProtectedArea(pathname: string): ProtectedArea | undefined {
  const [, locale, area, action, extra] = pathname.replace(/\/$/, '').split('/');
  if (!hasLocale(routing.locales, locale)) return undefined;
  switch (area) {
    case 'rider':
      return 'rider';
    case 'driver':
      return action === 'invite' && !extra ? undefined : 'driver';
    case 'coordinator':
      return action === 'login' && !extra ? undefined : 'coordinator';
    default:
      return undefined;
  }
}
