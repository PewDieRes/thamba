import { createSessionSubject } from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

const MAX_INVITE_TOKEN_LENGTH = 256;

export function createRedeemDriverInviteSchema(schema: InputSchemaFactory) {
  return schema.object({
    subject: schema.validated(createSessionSubject),
    token: schema.text(MAX_INVITE_TOKEN_LENGTH),
    commandKey: commandKey(schema),
  });
}

export type RedeemDriverInviteInput = InputOf<typeof createRedeemDriverInviteSchema>;
