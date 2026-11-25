import type { ApplicationError, ApplicationResult } from '@application/ports/application-result';

const PROTECTED_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

export function respondJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: PROTECTED_HEADERS });
}

export function respondError(code: ApplicationError['code'], status?: number) {
  return respondJson({ code }, status ?? statusFor(code));
}

export function respondResult<T>(result: ApplicationResult<T>, status = 200) {
  if (result.ok) return respondJson(result.value ?? null, status);
  const { error } = result;
  return error.code === 'stale_quote'
    ? respondJson(
        { code: error.code, freshQuote: 'freshQuote' in error ? error.freshQuote : undefined },
        statusFor(error.code),
      )
    : respondError(error.code);
}

function statusFor(code: ApplicationError['code']): number {
  switch (code) {
    case 'invalid_input':
      return 400;
    case 'unauthenticated':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit_exceeded':
      return 429;
    case 'storage_unavailable':
      return 503;
    case 'INVITE_EXPIRED':
    case 'INVITE_REVOKED':
      return 410;
    default:
      return 409;
  }
}
