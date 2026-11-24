import {
  createDriverId,
  createSessionSubject,
  createStandCoordinatorId,
  createStandId,
} from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createSetDriverAvailabilitySchema(schema: InputSchemaFactory) {
  return schema.object({
    actor: schema.union(
      schema.object({
        type: schema.literal('driver'),
        subject: schema.validated(createSessionSubject),
      }),
      schema.object({
        type: schema.literal('stand_coordinator'),
        coordinatorId: schema.validated(createStandCoordinatorId),
        standId: schema.validated(createStandId),
      }),
    ),
    driverId: schema.validated(createDriverId),
    isOnline: schema.boolean(),
    reason: schema.optional(schema.union(schema.literal('skip'), schema.literal('walk_up'))),
    commandKey: commandKey(schema),
  });
}

export type SetDriverAvailabilityInput = InputOf<typeof createSetDriverAvailabilitySchema>;
