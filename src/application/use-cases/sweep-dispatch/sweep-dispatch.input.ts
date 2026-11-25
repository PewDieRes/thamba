import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createSweepDispatchSchema(schema: InputSchemaFactory) {
  return schema.object({ batch: schema.literal('due') });
}

export type SweepDispatchInput = InputOf<typeof createSweepDispatchSchema>;
