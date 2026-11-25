import { parseLocaleCode } from '@domain/shared/locale-code.value-object';
import {
  createDriverId,
  createStandCoordinatorId,
  createStandId,
} from '@domain/shared/ids.value-object';
import { commandKey } from '@application/contracts/command-input';
import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

export function createIssueDriverInviteSchema(schema: InputSchemaFactory) {
  return schema.object({
    locale: schema.optional(schema.validated(parseLocaleCode)),
    coordinatorId: schema.validated(createStandCoordinatorId),
    standId: schema.validated(createStandId),
    driverId: schema.validated(createDriverId),
    commandKey: commandKey(schema),
  });
}

export type IssueDriverInviteInput = InputOf<typeof createIssueDriverInviteSchema>;
