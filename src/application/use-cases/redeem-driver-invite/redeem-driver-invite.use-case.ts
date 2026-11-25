import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext } from '@application/ports/actor-context';
import { canBookTown, getScope, sameScope } from '@application/operations/booking-authority';
import { getStandDriver, hasDriverSlot } from '@application/operations/driver-roster';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { appendEvents } from '@application/operations/record-events';
import type { ApplicationResult } from '@application/ports/application-result';
import type { ActiveDriverDevice } from '@domain/identity/driver-device';
import type { Clock } from '@application/ports/clock';
import type { CommandHasher } from '@application/ports/command-hasher';
import type { IdGenerator } from '@application/ports/id-generator';
import type { Transaction } from '@application/ports/unit-of-work';
import { createInviteTokenHash, redeemInvite } from '@domain/identity/driver-invite';
import type { DriverInvite } from '@domain/identity/driver-invite';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { RedeemDriverInviteInput } from './redeem-driver-invite.input';

type DriverBinding = Pick<ActiveDriverDevice, 'driverId' | 'status'> & {
  readonly bindingVersion: number;
};

export class RedeemDriverInvite {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
      hasher: CommandHasher;
    },
    private readonly schema: InputSchema<RedeemDriverInviteInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids, hasher } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'invite', schema: this.schema },
      input,
      async ({ token, subject, commandKey }) => {
        const hash = createInviteTokenHash(hasher.hash(token));
        if (!hash.ok) return err({ code: 'not_found' });
        const value = { subject, commandKey, tokenHash: hash.value };
        const result = await commands.run<DriverBinding>(
          {
            actor: `session:${subject}`,
            name: 'redeem_driver_invite',
            target: { kind: 'invite', tokenHash: hash.value },
            input: value,
            onReplay: (tx, result) => verifyRedemptionReplay(tx, value, result),
          },
          (tx) => bindDriver(tx, value, { ids, now: clock.now() }),
        );
        return result.ok
          ? ok({ driverId: result.value.driverId, status: result.value.status })
          : result;
      },
    );
  }
}

async function bindDriver(
  tx: Transaction,
  { subject, tokenHash }: { subject: SessionSubject; tokenHash: DriverInvite['tokenHash'] },
  { ids, now }: { ids: IdGenerator; now: Instant },
) {
  const pending = await tx.invites.get(tokenHash);
  if (!pending) return err({ code: 'not_found' as const });
  const { invite, standId } = pending.value;
  const decision = redeemInvite(invite, subject, now);
  if (!decision.ok) return decision;
  const eligibility = await verifyBinding(tx, pending.value, { subject, now });
  if (!eligibility.ok) return eligibility;
  const { prior, scope, driverId } = eligibility.value;
  const consumed = await tx.invites.save(
    { ...pending.value, invite: decision.value.invite },
    pending.version,
  );
  if (!consumed.ok) return consumed;
  const previousVersion = prior?.version;
  const device = await tx.devices.save(decision.value.device, previousVersion ?? null);
  if (!device.ok) return device;
  const recorded = await appendEvents(tx.events, ids, [
    {
      ...scope,
      type: 'DriverInviteRedeemed',
      occurredAt: now,
      driverId,
      standId,
      actor: { type: 'driver', driverId },
    },
  ]);
  return recorded.ok
    ? commit({
        status: decision.value.device.status,
        driverId,
        bindingVersion: (previousVersion ?? 0) + 1,
      })
    : recorded;
}

async function verifyBinding(
  tx: Transaction,
  pending: import('@application/ports/driver-invite-repository').ScopedDriverInvite,
  { subject, now }: { subject: SessionSubject; now: Instant },
) {
  const {
    invite: { driverId },
    standId,
  } = pending;
  const roster = await getStandDriver(tx, driverId, standId);
  if (!roster.ok || !sameScope(roster.value.stand, pending))
    return err({ code: 'not_found' as const });
  const scope = getScope(pending);
  const town = (await tx.towns.get(scope.townId))?.value;
  if (scope.demoRunId === undefined || !canBookTown(town, scope, now))
    return err({ code: 'booking_unavailable' as const });
  const prior = await tx.devices.get(subject);
  if (prior?.value.status === 'active') return err({ code: 'session_already_bound' as const });
  if (await tx.devices.findActiveByDriver(driverId))
    return err({ code: 'driver_already_bound' as const });
  if (await hasDriverSlot(tx, driverId)) return err({ code: 'driver_slot_occupied' as const });
  return ok({ prior, scope, driverId });
}

async function verifyRedemptionReplay(
  tx: Transaction,
  { subject, tokenHash }: { subject: SessionSubject; tokenHash: DriverInvite['tokenHash'] },
  result: ApplicationResult<DriverBinding>,
) {
  if (!result.ok) return result;
  const [device, token] = await Promise.all([tx.devices.get(subject), tx.invites.get(tokenHash)]);
  const invite = token?.value.invite;
  if (
    device?.value.status !== 'active' ||
    device.value.driverId !== result.value.driverId ||
    invite?.status !== 'redeemed' ||
    device.version !== result.value.bindingVersion
  ) {
    return err({ code: 'DEVICE_REVOKED' as const });
  }
  return result;
}
