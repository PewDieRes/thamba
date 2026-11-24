import { createBookingId } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createAdvanceDispatchSchema(schema: InputSchemaFactory) {
  return schema.object({
    bookingId: schema.validated(createBookingId),
    commandKey: schema.optional(commandKey(schema)),
  });
}

export type AdvanceDispatchInput = InputOf<typeof createAdvanceDispatchSchema>;
