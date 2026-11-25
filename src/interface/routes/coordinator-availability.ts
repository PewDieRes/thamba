import type { ApplicationResult } from '@application/ports/application-result';
import { z } from 'zod';
import { commandKey } from './command-key.input';
import { createCommandRoute } from './command-route';

const driver = { standId: z.guid().toLowerCase(), driverId: z.guid(), commandKey };
const schema = z.discriminatedUnion('isOnline', [
  z.strictObject({ ...driver, isOnline: z.literal(true) }),
  z.strictObject({
    ...driver,
    isOnline: z.literal(false),
    reason: z.enum(['offline', 'break', 'walk_up', 'skip']),
  }),
]);

export function createCoordinatorAvailabilityRoute({
  guard,
  execute,
}: {
  guard: () => Promise<Response | undefined>;
  execute: (input: unknown) => Promise<ApplicationResult<unknown>>;
}) {
  return createCommandRoute({
    schema,
    guard,
    execute: async ({ standId, ...input }) => {
      const result = await execute({ ...input, actor: { standId } });
      return result.ok ? { ok: true, value: null } : result;
    },
  });
}
