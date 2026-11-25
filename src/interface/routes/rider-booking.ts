import { z } from 'zod';
import type { ApplicationResult } from '@application/ports/application-result';
import { commandKey } from './command-key.input';
import { createCommandRoute } from './command-route';
import { respondError } from './application-response';

const booking = z.strictObject({
  quoteId: z.uuid(),
  standId: z.uuid(),
  commandKey,
  isScheduled: z.boolean().optional(),
});

type RiderBookingDependencies = {
  allow: () => Promise<ApplicationResult<boolean>>;
  ensureAnonymous: () => Promise<ApplicationResult<void>>;
  requestRide: { execute(input: unknown): Promise<ApplicationResult<unknown>> };
  scheduleRide?: { execute(input: unknown): Promise<ApplicationResult<unknown>> };
};

export function createRiderBookingRoute(ports: RiderBookingDependencies) {
  return createCommandRoute({
    schema: booking,
    status: 201,
    guard: async () => {
      const rate = await ports.allow();
      if (!rate.ok) return respondError(rate.error.code);
      if (!rate.value) return respondError('rate_limit_exceeded');
      const auth = await ports.ensureAnonymous();
      return auth.ok ? undefined : respondError(auth.error.code);
    },
    execute: ({ isScheduled, ...input }) => {
      const useCase = isScheduled ? ports.scheduleRide : ports.requestRide;
      return useCase
        ? useCase.execute(input)
        : Promise.resolve({ ok: false, error: { code: 'invalid_input' } });
    },
  });
}
