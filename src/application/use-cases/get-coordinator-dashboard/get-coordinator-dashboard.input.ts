import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';
import { createStandId } from '@domain/shared/ids.value-object';

export function createGetCoordinatorDashboardSchema(schema: InputSchemaFactory) {
  return schema.object({ standId: schema.optional(schema.validated(createStandId)) });
}

export type GetCoordinatorDashboardInput = InputOf<typeof createGetCoordinatorDashboardSchema>;
