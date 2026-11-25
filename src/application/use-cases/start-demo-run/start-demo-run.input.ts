import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';
import { createRiderId, createStandId, createTownId } from '@domain/shared/ids.value-object';

export function createStartDemoRunSchema(schema: InputSchemaFactory) {
  return schema.object({
    townId: schema.validated(createTownId),
    standId: schema.validated(createStandId),
    riderId: schema.validated(createRiderId),
  });
}

export type StartDemoRunInput = InputOf<typeof createStartDemoRunSchema>;
