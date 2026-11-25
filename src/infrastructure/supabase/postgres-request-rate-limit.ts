import { createHash } from 'node:crypto';
import type { RateLimitScope, RequestRateLimit } from '@application/ports/request-rate-limit';
import type { Sql } from 'postgres';
import { UNAVAILABLE } from './repository-storage';

const REQUESTS_PER_MINUTE: Record<RateLimitScope, number> = {
  booking: 10,
  rider_session: 10,
  driver_session: 10,
  invite_issue: 10,
  invite_redeem: 10,
  coordinator_login: 5,
};

export class PostgresRequestRateLimit implements RequestRateLimit {
  constructor(private readonly sql: Sql) {}

  async allow(scope: RateLimitScope, key: string) {
    const digest = createHash('sha256').update(key).digest('hex');
    try {
      const [row] = await this.sql<{ allowed: boolean }[]>`
        select public.thamba_allow_request(${scope}, ${digest}, ${REQUESTS_PER_MINUTE[scope]}) as allowed
      `;
      return row ? { ok: true as const, value: row.allowed } : UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  }
}
