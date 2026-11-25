import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieMethodsServer } from '@supabase/ssr';
import { createAuthSession } from '@infrastructure/composition/container';
import { canAccessArea } from './interface/auth/area-guard';
import { getProtectedArea } from './interface/auth/protected-path';
import { getAppOrigin } from './interface/auth/request-origin';
import { routing } from './interface/i18n/routing';

const localize = createMiddleware(routing);
type CookieUpdate = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number];

export async function proxy(request: NextRequest) {
  const area = getProtectedArea(request.nextUrl.pathname);
  if (!area) return localize(request);
  const updates: CookieUpdate[] = [];
  const session = createAuthSession({
    getAll: () => request.cookies.getAll(),
    setAll: (cookies) => {
      for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
      updates.push(...cookies);
    },
  });
  const actor = await session.getActor();
  const allowed = canAccessArea(area, actor);
  const response = allowed ? localize(request) : denyArea(request, area, Boolean(actor));
  for (const { name, value, options } of updates) response.cookies.set(name, value, options);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function denyArea(request: NextRequest, area: string, isSignedIn: boolean) {
  if (area === 'coordinator') {
    const locale = request.nextUrl.pathname.split('/')[1] ?? routing.defaultLocale;
    return NextResponse.redirect(
      new URL(`/${locale}/coordinator/login`, getAppOrigin(request.url)),
    );
  }
  return new NextResponse(null, { status: isSignedIn ? 403 : 401 });
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
