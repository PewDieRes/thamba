import { z } from 'zod';
import type { ApplicationResult } from '@application/ports/application-result';
import { respondError, respondResult } from './application-response';

interface SweepCounts {
  attempted: number;
  advanced: number;
  failed: number;
}

interface SweepDependencies {
  readonly isAuthorized: (header: string | null) => boolean;
  readonly sweepDispatch: { execute(input: unknown): Promise<ApplicationResult<SweepCounts>> };
  readonly logCounts: (counts: SweepCounts) => void;
}

const sweepBody = z.strictObject({});

export function createDispatchSweepRoute({
  isAuthorized,
  sweepDispatch,
  logCounts,
}: SweepDependencies) {
  return async function post(request: Request): Promise<Response> {
    if (!isAuthorized(request.headers.get('authorization'))) return respondError('unauthenticated');
    const body: unknown = request.body === null ? {} : await request.json().catch(() => undefined);
    if (!sweepBody.safeParse(body).success) return respondError('invalid_input');
    const result = await sweepDispatch.execute({ batch: 'due' });
    if (result.ok) logCounts(result.value);
    return respondResult(result, result.ok && result.value.failed > 0 ? 503 : 200);
  };
}
