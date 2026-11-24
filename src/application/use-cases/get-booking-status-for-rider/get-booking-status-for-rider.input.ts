import { createBookingId, createRiderId } from '@domain/shared/ids.value-object';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createGetBookingStatusForRiderSchema(schema: InputSchemaFactory) {
  return schema.object({
    riderId: schema.validated(createRiderId),
    bookingId: schema.validated(createBookingId),
  });
}

export type GetBookingStatusForRiderInput = InputOf<typeof createGetBookingStatusForRiderSchema>;
