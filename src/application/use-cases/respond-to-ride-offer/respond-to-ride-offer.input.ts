import { createRideOfferId, createSessionSubject } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createRespondToRideOfferSchema(schema: InputSchemaFactory) {
  return schema.object({
    subject: schema.validated(createSessionSubject),
    offerId: schema.validated(createRideOfferId),
    action: schema.union(schema.literal('accept'), schema.literal('decline')),
    commandKey: commandKey(schema),
  });
}

export type RespondToRideOfferInput = InputOf<typeof createRespondToRideOfferSchema>;
