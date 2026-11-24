import createMiddleware from 'next-intl/middleware';
import { routing } from './interface/i18n/routing';

export const proxy = createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
