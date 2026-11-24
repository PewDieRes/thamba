const HTTP_NOT_IMPLEMENTED = 501;

export function respondNotImplemented(): Response {
  return new Response(null, { status: HTTP_NOT_IMPLEMENTED });
}
