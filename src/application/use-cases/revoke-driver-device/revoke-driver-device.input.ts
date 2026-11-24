import {
  createDriverId,
  createStandCoordinatorId,
  createStandId,
} from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createRevokeDriverDeviceSchema(schema: InputSchemaFactory) {
  return schema.object({
    coordinatorId: schema.validated(createStandCoordinatorId),
    standId: schema.validated(createStandId),
    driverId: schema.validated(createDriverId),
    commandKey: commandKey(schema),
  });
}

export type RevokeDriverDeviceInput = InputOf<typeof createRevokeDriverDeviceSchema>;
