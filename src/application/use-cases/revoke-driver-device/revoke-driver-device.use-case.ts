import type { InputSchema } from '@application/contracts/input-schema';
import { validateActorInput } from '@application/operations/validate-actor-input';
import type { ActorContext, CoordinatorMembership } from '@application/ports/actor-context';
import { getScope, sameScope } from '@application/operations/booking-authority';
import { getStandDriver, hasDriverSlot } from '@application/operations/driver-roster';
import { commit, type CommandExecutor } from '@application/operations/execute-command';
import { appendEvents } from '@application/operations/record-events';
import { saveQueueChange } from '@application/operations/save-booking-decision';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { Transaction } from '@application/ports/unit-of-work';
import { leaveDriverQueue } from '@domain/dispatch/driver-queue-entry';
import { revokeDevice } from '@domain/identity/driver-device';
import type { DriverId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import { err, ok } from '@domain/shared/result';
import type { BookingScope } from '@domain/town/town';
import type { RevokeDriverDeviceInput } from './revoke-driver-device.input';

export class RevokeDriverDevice {
  constructor(
    private readonly ports: {
      actorContext: ActorContext;
      commands: CommandExecutor;
      clock: Clock;
      ids: IdGenerator;
    },
    private readonly schema: InputSchema<RevokeDriverDeviceInput>,
  ) {}

  execute(input: unknown) {
    const { commands, clock, ids } = this.ports;
    return validateActorInput(
      { actorContext: this.ports.actorContext, role: 'coordinator', schema: this.schema },
      input,
      (value, membership) =>
        commands.run(
          {
            actor: `coordinator:${value.coordinatorId}`,
            name: 'revoke_driver_device',
            target: { kind: 'stand', standId: value.standId },
            input: value,
          },
          (tx) => revokeBinding(tx, value, { membership, ids, now: clock.now() }),
        ),
    );
  }
}

async function revokeBinding(
  tx: Transaction,
  { driverId, standId, coordinatorId }: RevokeDriverDeviceInput,
  {
    ids,
    now,
    membership,
  }: { ids: IdGenerator; now: Instant; membership: CoordinatorMembership | undefined },
) {
  const roster = await getStandDriver(tx, driverId, standId);
  if (!roster.ok) return roster;
  if (!membership || !sameScope(membership, roster.value.stand))
    return err({ code: 'forbidden' as const });
  const current = await tx.devices.findActiveByDriver(driverId);
  if (!current) return err({ code: 'not_found' as const });
  if (await hasDriverSlot(tx, driverId)) return err({ code: 'driver_slot_occupied' as const });
  const device = revokeDevice(current.value, now);
  if (!device.ok) return device;
  const stored = await tx.devices.save(device.value, current.version);
  if (!stored.ok) return stored;
  const actor = { type: 'stand_coordinator' as const, coordinatorId, standId };
  const removed = await closeDriverAccess(tx, roster.value, { actor, ids, now });
  return removed.ok ? commit({ status: device.value.status, driverId }) : removed;
}

async function closeDriverAccess(
  tx: Transaction,
  { queue, stand }: Extract<Awaited<ReturnType<typeof getStandDriver>>, { ok: true }>['value'],
  {
    actor,
    ids,
    now,
  }: {
    actor: import('@domain/dispatch/booking-events').StandCoordinatorActor;
    ids: IdGenerator;
    now: Instant;
  },
) {
  const { driverId } = queue.value.entry;
  const { standId } = stand;
  if (queue.value.entry.availability === 'online') {
    const removed = await saveQueueChange(tx, ids, {
      previous: queue,
      entry: leaveDriverQueue(queue.value.entry),
      actor,
      now,
      reason: 'offline',
    });
    if (!removed.ok) return removed;
  }
  const scope = getScope(stand);
  const revoked = await revokeIssuedInvites(tx.invites, { driverId, scope, now });
  if (!revoked.ok) return revoked;
  return appendEvents(tx.events, ids, [
    {
      ...scope,
      type: 'DriverDeviceRevoked',
      occurredAt: now,
      driverId,
      standId,
      actor,
    },
  ]);
}

async function revokeIssuedInvites(
  invites: Transaction['invites'],
  { driverId, scope, now }: { driverId: DriverId; scope: BookingScope; now: Instant },
) {
  for (const { value, version } of await invites.listIssuedByDriver(driverId)) {
    if (!sameScope(value, scope)) continue;
    const result = await invites.save(
      { ...value, invite: { ...value.invite, status: 'revoked', revokedAt: now } },
      version,
    );
    if (!result.ok) return result;
  }
  return ok(undefined);
}
