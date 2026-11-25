import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

const MAX_EMAIL_CHARACTERS = 254;
const MAX_CALLBACK_URL_CHARACTERS = 2_048;

export function createCoordinatorSignInSchema(schema: InputSchemaFactory) {
  return schema.object({
    email: schema.text(MAX_EMAIL_CHARACTERS),
    callback: schema.text(MAX_CALLBACK_URL_CHARACTERS),
  });
}

export type CoordinatorSignInInput = InputOf<typeof createCoordinatorSignInSchema>;
