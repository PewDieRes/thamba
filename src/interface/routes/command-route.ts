import { z } from 'zod';
import type { ApplicationResult } from '@application/ports/application-result';
import { isSameOrigin } from '../auth/request-origin';
import { respondError, respondResult } from './application-response';

export interface CommandRoute<T> {
  readonly schema: z.ZodType<T>;
  readonly execute: (input: T) => Promise<ApplicationResult<unknown>>;
  readonly guard?: () => Promise<Response | undefined>;
  readonly status?: number;
}

export function createCommandRoute<T>({ schema, guard, execute, status }: CommandRoute<T>) {
  return async function post(request: Request): Promise<Response> {
    if (!isSameOrigin(request)) return respondError('forbidden');
    const data = schema.safeParse(await request.json().catch(() => undefined));
    if (!data.success) return respondError('invalid_input');
    const blocked = await guard?.();
    return blocked ?? respondResult(await execute(data.data), status);
  };
}
