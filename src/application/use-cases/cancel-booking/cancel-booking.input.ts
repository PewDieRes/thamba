import {
  createBookingId,
  createRiderId,
  createSessionSubject,
} from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createCancelBookingSchema(schema: InputSchemaFactory) {
  return schema.object({
    actor: schema.union(
      schema.object({
        type: schema.literal('driver'),
        subject: schema.validated(createSessionSubject),
      }),
      schema.object({ type: schema.literal('rider'), riderId: schema.validated(createRiderId) }),
    ),
    bookingId: schema.validated(createBookingId),
    commandKey: commandKey(schema),
  });
}

export type CancelBookingInput = InputOf<typeof createCancelBookingSchema>;
