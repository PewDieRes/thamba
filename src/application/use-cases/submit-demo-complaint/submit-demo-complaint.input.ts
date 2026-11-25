import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';
import {
  createComplaintId,
  createDemoRunId,
  createRiderId,
  createTownId,
} from '@domain/shared/ids.value-object';

export function createSubmitDemoComplaintSchema(schema: InputSchemaFactory) {
  return schema.object({
    townId: schema.validated(createTownId),
    demoRunId: schema.validated(createDemoRunId),
    riderId: schema.validated(createRiderId),
    complaintId: schema.validated(createComplaintId),
    topic: schema.union(
      schema.literal('fare'),
      schema.union(schema.literal('wait'), schema.literal('trip')),
    ),
  });
}

export type SubmitDemoComplaintInput = InputOf<typeof createSubmitDemoComplaintSchema>;
