import { createBookingId, createSessionSubject } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createStartTripSchema(schema: InputSchemaFactory) {
  return schema.object({
    subject: schema.validated(createSessionSubject),
    bookingId: schema.validated(createBookingId),
    commandKey: commandKey(schema),
  });
}

export type StartTripInput = InputOf<typeof createStartTripSchema>;
