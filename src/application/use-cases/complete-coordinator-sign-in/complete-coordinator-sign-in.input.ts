import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

const MAX_AUTH_CODE_CHARACTERS = 512;

export function createCompleteCoordinatorSignInSchema(schema: InputSchemaFactory) {
  return schema.object({ code: schema.text(MAX_AUTH_CODE_CHARACTERS) });
}

export type CompleteCoordinatorSignInInput = InputOf<typeof createCompleteCoordinatorSignInSchema>;
