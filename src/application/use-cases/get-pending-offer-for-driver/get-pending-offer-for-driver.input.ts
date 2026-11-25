import { createSessionSubject } from '@domain/shared/ids.value-object';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createGetPendingOfferForDriverSchema(schema: InputSchemaFactory) {
  return schema.object({
    includeDisplay: schema.optional(schema.boolean()),
    subject: schema.validated(createSessionSubject),
  });
}

export type GetPendingOfferForDriverInput = InputOf<typeof createGetPendingOfferForDriverSchema>;
