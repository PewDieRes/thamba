import type { InputSchemaFactory } from './input-schema';

const MAX_COMMAND_KEY_LENGTH = 128;

export function commandKey(schema: InputSchemaFactory) {
  return schema.text(MAX_COMMAND_KEY_LENGTH);
}
