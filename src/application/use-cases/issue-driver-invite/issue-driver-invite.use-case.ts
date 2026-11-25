import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { canBookTown, getScope } from '@application/operations/booking-authority';
import { getStandDriver, hasDriverSlot } from '@application/operations/driver-roster';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { appendEvents } from '@application/operations/record-events';
import type { Clock } from '@application/ports/clock';
import type { CommandHasher } from '@application/ports/command-hasher';
import type { IdGenerator } from '@application/ports/id-generator';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';
import type { ScopedDriverInvite } from '@application/ports/driver-invite-repository';
import type { Transaction } from '@application/ports/unit-of-work';
import { createInviteTokenHash } from '@domain/identity/driver-invite';
import { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IssueDriverInviteInput } from './issue-driver-invite.input';

const INVITE_TTL_MILLISECONDS = 900_000;

interface InviteDependencies {
  readonly commands: CommandExecutor;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly hasher: CommandHasher;
  readonly tokens: InviteTokenGenerator;
}

export class IssueDriverInvite {
  constructor(
    private readonly ports: InviteDependencies,
    private readonly schema: InputSchema<IssueDriverInviteInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, hasher, tokens } = this.ports;
    return validateInput(this.schema, input, async (value) => {
      const actor = `coordinator:${value.coordinatorId}`;
      // The persisted command identity and verified input recover the token without storing it.
      const token = tokens.derive(
        JSON.stringify([actor, value.commandKey, value.standId, value.driverId]),
      );
      const tokenHash = createInviteTokenHash(hasher.hash(token));
      if (!tokenHash.ok) return err({ code: 'inconsistent_state' });
      const result = await commands.run(
        { actor, name: 'issue_driver_invite', input: value },
        (tx) => issueInvite(tx, value, { tokenHash: tokenHash.value, now: clock.now(), ids }),
      );
      return result.ok ? ok({ ...result.value, token }) : result;
    });
  }
}

async function issueInvite(
  tx: Transaction,
  { driverId, standId, coordinatorId }: IssueDriverInviteInput,
  {
    now,
    ids,
    tokenHash,
  }: {
    now: Instant;
    ids: IdGenerator;
    tokenHash: import('@domain/identity/driver-invite').DriverInvite['tokenHash'];
  },
) {
  const roster = await getStandDriver(tx, driverId, standId);
  if (!roster.ok) return roster;
  const scope = getScope(roster.value.stand);
  const town = (await tx.towns.get(scope.townId))?.value;
  if (!canBookTown(town, scope, now)) return err({ code: 'booking_unavailable' as const });
  if (await tx.devices.findActiveByDriver(driverId))
    return err({ code: 'driver_already_bound' as const });
  if (await hasDriverSlot(tx, driverId)) return err({ code: 'driver_slot_occupied' as const });
  const expiresAt = Instant.fromEpochMilliseconds(now.epochMilliseconds + INVITE_TTL_MILLISECONDS);
  if (!expiresAt.ok) return err({ code: 'invalid_expiry' as const });
  const invite = { driverId, tokenHash, status: 'issued' as const, expiresAt: expiresAt.value };
  return saveInvite(tx, { ...scope, standId, invite }, { coordinatorId, now, ids });
}

async function saveInvite(
  tx: Transaction,
  record: ScopedDriverInvite,
  {
    coordinatorId,
    now,
    ids,
  }: Pick<IssueDriverInviteInput, 'coordinatorId'> & { now: Instant; ids: IdGenerator },
) {
  const saved = await tx.invites.save(record, null);
  if (!saved.ok) return saved;
  const {
    standId,
    invite: { driverId, expiresAt },
  } = record;
  const event = await appendEvents(tx.events, ids, [
    {
      ...getScope(record),
      type: 'DriverInviteIssued',
      occurredAt: now,
      driverId,
      standId,
      actor: { type: 'stand_coordinator', coordinatorId, standId },
    },
  ]);
  return event.ok
    ? commit({ driverId, expiresAtEpochMilliseconds: expiresAt.epochMilliseconds })
    : event;
}
