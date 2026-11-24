import {
  createDemoRunId,
  createLandmarkId,
  createRiderId,
  createTownId,
} from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';
import { Instant } from '@domain/shared/instant.value-object';
import { PassengerCount } from '@domain/shared/passenger-count.value-object';
import { map } from '@domain/shared/result';

function parsePassengerCount(input: unknown) {
  return map(PassengerCount.fromCount(input), ({ count }) => count);
}

function parseEpochMilliseconds(input: unknown) {
  return map(Instant.fromEpochMilliseconds(input), ({ epochMilliseconds }) => epochMilliseconds);
}

export function createQuoteFareSchema(schema: InputSchemaFactory) {
  return schema.object({
    riderId: schema.validated(createRiderId),
    townId: schema.validated(createTownId),
    demoRunId: schema.optional(schema.validated(createDemoRunId)),
    pickupLandmarkId: schema.validated(createLandmarkId),
    destinationLandmarkId: schema.validated(createLandmarkId),
    passengers: schema.validated(parsePassengerCount),
    pickupAtEpochMilliseconds: schema.optional(schema.validated(parseEpochMilliseconds)),
    commandKey: commandKey(schema),
  });
}

export type QuoteFareInput = InputOf<typeof createQuoteFareSchema>;
