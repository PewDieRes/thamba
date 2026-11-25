export function getAppOrigin(requestUrl: string): string {
  const configured = process.env.APP_ORIGIN;
  if (configured) return new URL(configured).origin;
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`).origin;
  return new URL(requestUrl).origin;
}

export function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === getAppOrigin(request.url);
}
