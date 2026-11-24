import { createSessionSubject } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createRejoinQueueSchema(schema: InputSchemaFactory) {
  return schema.object({
    subject: schema.validated(createSessionSubject),
    commandKey: commandKey(schema),
  });
}

export type RejoinQueueInput = InputOf<typeof createRejoinQueueSchema>;
