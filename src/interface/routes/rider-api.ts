import type { ApplicationError } from '@application/ports/application-result';

export type RiderApiResult<T> = { ok: true; value: T } | { ok: false; error: ApplicationError };

export async function postRider<T>(
  route: 'demo-run' | 'demo-complaint' | 'quote' | 'bookings' | 'status',
  body: object,
  signal?: AbortSignal,
): Promise<RiderApiResult<T>> {
  try {
    const response = await fetch(`/api/rider/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      referrerPolicy: 'same-origin',
      ...(signal ? { signal } : {}),
    });
    return response.ok
      ? { ok: true, value: (await response.json()) as T }
      : { ok: false, error: (await response.json()) as ApplicationError };
  } catch {
    return { ok: false, error: { code: 'storage_unavailable' } };
  }
}
