import { createFareQuoteId, createRiderId, createStandId } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createRequestRideSchema(schema: InputSchemaFactory) {
  return schema.object({
    riderId: schema.validated(createRiderId),
    quoteId: schema.validated(createFareQuoteId),
    standId: schema.validated(createStandId),
    commandKey: commandKey(schema),
  });
}

export type RequestRideInput = InputOf<typeof createRequestRideSchema>;
