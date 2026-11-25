import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext, CoordinatorMembership } from '@application/ports/actor-context';
import { getScope, sameScope } from '@application/operations/booking-authority';
import { getStandDriver } from '@application/operations/driver-roster';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { appendEvents } from '@application/operations/record-events';
import type { Clock } from '@application/ports/clock';
import type { CommandHasher } from '@application/ports/command-hasher';
import type { IdGenerator } from '@application/ports/id-generator';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';
import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import type { ScopedDriverInvite } from '@application/ports/driver-invite-repository';
import type { Transaction } from '@application/ports/unit-of-work';
import { canIssueInvite } from '@domain/identity/driver-invite-eligibility';
import { createInviteTokenHash } from '@domain/identity/driver-invite';
import { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { IssueDriverInviteInput } from './issue-driver-invite.input';

const INVITE_TTL_MILLISECONDS = 900_000;

interface InviteDependencies {
  readonly actorContext: ActorContext;
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
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'coordinator', schema: this.schema },
      input,
      async (value, membership) => {
        const actor = `coordinator:${value.coordinatorId}`;
        // Derivation keeps the raw token out of the invite and command records.
        const token = tokens.derive(
          JSON.stringify([actor, value.commandKey, value.standId, value.driverId]),
        );
        const tokenHash = createInviteTokenHash(hasher.hash(token));
        if (!tokenHash.ok) return err({ code: 'inconsistent_state' });
        const result = await commands.run(
          {
            actor,
            name: 'issue_driver_invite',
            target: { kind: 'stand', standId: value.standId },
            input: value,
            onReplay: () => Promise.resolve(err({ code: 'invite_already_issued' })),
          },
          (tx) =>
            issueInvite(tx, value, {
              membership,
              tokenHash: tokenHash.value,
              now: clock.now(),
              ids,
            }),
        );
        return result.ok
          ? ok({ ...result.value, url: `/${value.locale ?? 'mr'}/driver/invite#${token}` })
          : result;
      },
    );
  }
}

async function issueInvite(
  tx: Transaction,
  { driverId, standId, coordinatorId }: IssueDriverInviteInput,
  {
    membership,
    now,
    ids,
    tokenHash,
  }: {
    membership: CoordinatorMembership | undefined;
    now: Instant;
    ids: IdGenerator;
    tokenHash: import('@domain/identity/driver-invite').DriverInvite['tokenHash'];
  },
) {
  const roster = await getStandDriver(tx, driverId, standId);
  if (!roster.ok) return roster;
  if (!membership || !sameScope(membership, roster.value.stand))
    return err({ code: 'forbidden' as const });
  const scope = getScope(roster.value.stand);
  const eligibility = await checkInviteEligibility(tx, roster.value.queue.value);
  if (!eligibility.ok) return eligibility;
  const expiresAt = Instant.fromEpochMilliseconds(now.epochMilliseconds + INVITE_TTL_MILLISECONDS);
  if (!expiresAt.ok) return err({ code: 'invalid_expiry' as const });
  const invite = { driverId, tokenHash, status: 'issued' as const, expiresAt: expiresAt.value };
  return saveInvite(tx, { ...scope, standId, invite }, { coordinatorId, now, ids });
}

async function checkInviteEligibility(
  tx: Transaction,
  { townId, demoRunId, isSynthetic, entry: { driverId } }: ScopedQueueEntry,
) {
  const [record, device, offer, trip] = await Promise.all([
    tx.towns.get(townId),
    tx.devices.findActiveByDriver(driverId),
    tx.offers.findPendingByDriver(driverId),
    tx.trips.findActiveByDriver(driverId),
  ]);
  const town = record?.value.town;
  return canIssueInvite({
    bookingMode: town?.bookingMode ?? null,
    hasSimulationProfile: town?.simulationProfile !== undefined,
    isInDemoRun: record?.value.demoRuns.some((run) => run.demoRunId === demoRunId) ?? false,
    isSynthetic: isSynthetic ?? demoRunId !== undefined,
    hasSlot: true,
    hasDevice: device !== undefined,
    hasPendingOffer: offer !== undefined,
    hasActiveTrip: trip !== undefined,
  });
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
