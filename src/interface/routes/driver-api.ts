import type { DriverOfferView, DriverStateView } from '@application/contracts/driver-state-view';
import type { TripAction } from '../ui/driver/driver-trip';

export type DriverCommand =
  | { route: 'availability'; driverId: DriverStateView['driverId']; isOnline: boolean }
  | { route: 'rejoin' }
  | { route: 'respond'; offerId: DriverOfferView['offerId']; action: 'accept' | 'decline' }
  | { route: TripAction; bookingId: NonNullable<DriverStateView['trip']>['bookingId'] };

type DriverRoute = DriverCommand['route'] | 'state' | 'pending-offer';

type DriverResponse<Route> = Route extends 'state'
  ? DriverStateView
  : Route extends 'pending-offer'
    ? DriverOfferView | null
    : unknown;

const REQUEST_TIMEOUT_MILLISECONDS = 12_000;

export async function postDriver<Route extends DriverRoute>(
  route: Route,
  body: object,
  signal?: AbortSignal,
) {
  try {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS);
    const response = await fetch(`/api/driver/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.ok)
      return { ok: true as const, value: (await response.json()) as DriverResponse<Route> };
    const error: unknown = await response.json().catch(() => null);
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    return { ok: false as const, code, status: response.status };
  } catch {
    return { ok: false as const, code: 'network_error', status: 0 };
  }
}
