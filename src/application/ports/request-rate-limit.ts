import type { ApplicationResult } from './application-result';

export type RateLimitScope =
  | 'booking'
  | 'rider_session'
  | 'driver_session'
  | 'invite_issue'
  | 'invite_redeem'
  | 'coordinator_login';

export interface RequestRateLimit {
  allow(scope: RateLimitScope, key: string): Promise<ApplicationResult<boolean>>;
}
