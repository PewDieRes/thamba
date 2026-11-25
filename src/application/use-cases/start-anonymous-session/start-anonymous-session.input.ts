import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createStartAnonymousSessionSchema(schema: InputSchemaFactory) {
  return schema.object({});
}

export type StartAnonymousSessionInput = InputOf<typeof createStartAnonymousSessionSchema>;
