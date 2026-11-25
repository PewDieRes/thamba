import { expect, test } from 'vitest';
import { createInviteTokenHash } from '@domain/identity/driver-invite';
import { Instant } from '@domain/shared/instant.value-object';
import { Town } from '@domain/town/town';
import {
  DEMO_TOWN,
  DRIVER_ONE,
  DRIVER_TWO,
  NEW_SUBJECT,
  NOW,
  OTHER_SUBJECT,
  SCOPE,
  STAND,
  SUBJECT_ONE,
  TOWN,
} from './demo-data.fixtures';
import { createDemo, dispatchRide, inviteInput, unwrap } from './demo.fixtures';

test('concurrent invite redemption commits one binding and a replay recovers the original result', async () => {
  const app = await createDemo();
  const invite = unwrap(await app.issueDriverInvite.execute(inviteInput));
  expect(await app.issueDriverInvite.execute(inviteInput)).toEqual({
    ok: false,
    error: { code: 'invite_already_issued' },
  });
  const subjects = [NEW_SUBJECT, OTHER_SUBJECT];
  const inputs = subjects.map((subject) => ({
    subject,
    token: invite.url.split('#')[1],
    commandKey: 'bind',
  }));
  const results = await Promise.all(inputs.map((value) => app.redeemDriverInvite.execute(value)));
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  const winning = inputs[results.findIndex((result) => result.ok)];
  if (!winning) throw new Error('Expected a Driver binding');
  expect(await app.redeemDriverInvite.execute(winning)).toMatchObject({
    ok: true,
    value: { status: 'active' },
  });
  unwrap(await app.revokeDriverDevice.execute({ ...inviteInput, commandKey: 'revoke-winner' }));
  expect(await app.redeemDriverInvite.execute(winning)).toEqual({
    ok: false,
    error: { code: 'DEVICE_REVOKED' },
  });
  expect(
    (await app.events()).filter(({ event }) => event.type === 'DriverInviteRedeemed'),
  ).toHaveLength(1);
});

test('binding rejects expired, unknown and out-of-scope invites', async () => {
  const app = await createDemo();
  const invite = unwrap(await app.issueDriverInvite.execute(inviteInput));
  const input = { subject: NEW_SUBJECT, token: invite.url.split('#')[1], commandKey: 'bind' };
  expect(await app.redeemDriverInvite.execute({ ...input, token: 'unknown' })).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  expect(await app.redeemDriverInvite.execute({ ...input, subject: SUBJECT_ONE })).toMatchObject({
    ok: false,
    error: { code: 'session_already_bound' },
  });
  unwrap(await app.unitOfWork.run(({ towns }) => towns.save({ ...DEMO_TOWN, demoRuns: [] }, 1)));
  expect(await app.redeemDriverInvite.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'booking_unavailable' },
  });
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(invite.expiresAtEpochMilliseconds)));
  expect(await app.redeemDriverInvite.execute(input)).toMatchObject({
    ok: false,
    error: { code: 'INVITE_EXPIRED' },
  });
  unwrap(
    await app.unitOfWork.run(({ towns }) =>
      towns.save({ ...DEMO_TOWN, town: Town.create({ townId: TOWN }) }, 2),
    ),
  );
  expect(
    await app.issueDriverInvite.execute({ ...inviteInput, commandKey: 'other invite' }),
  ).toMatchObject({ ok: false, error: { code: 'booking_unavailable' } });
});

test('recovery rejects active reservations and revokes still-issued invites for the Driver', async () => {
  const app = await createDemo();
  await dispatchRide(app);
  expect(
    await app.revokeDriverDevice.execute({ ...inviteInput, driverId: DRIVER_ONE }),
  ).toMatchObject({ ok: false, error: { code: 'driver_slot_occupied' } });
  expect(
    await app.issueDriverInvite.execute({ ...inviteInput, driverId: DRIVER_TWO }),
  ).toMatchObject({ ok: false, error: { code: 'driver_already_bound' } });
  expect(await app.revokeDriverDevice.execute(inviteInput)).toMatchObject({
    ok: false,
    error: { code: 'not_found' },
  });
  const tokenHash = unwrap(createInviteTokenHash('a'.repeat(64)));
  unwrap(
    await app.unitOfWork.run(({ invites }) =>
      invites.save(
        {
          ...SCOPE,
          standId: STAND,
          invite: { driverId: DRIVER_TWO, expiresAt: NOW, status: 'issued', tokenHash },
        },
        null,
      ),
    ),
  );
  const revoked = { ...inviteInput, driverId: DRIVER_TWO };
  expect(await app.revokeDriverDevice.execute(revoked)).toMatchObject({
    ok: true,
    value: { status: 'revoked' },
  });
  expect(
    unwrap(
      await app.unitOfWork.run(async ({ invites }) => ({
        ok: true,
        value: await invites.get(tokenHash),
      })),
    )?.value.invite.status,
  ).toBe('revoked');
});

test('a revoked invite replay fails after rebinding the same Driver at the same instant', async () => {
  const app = await createDemo();
  const first = unwrap(await app.issueDriverInvite.execute(inviteInput));
  const redeem = {
    subject: NEW_SUBJECT,
    token: first.url.split('#')[1],
    commandKey: 'first-binding',
  };
  unwrap(await app.redeemDriverInvite.execute(redeem));
  unwrap(
    await app.revokeDriverDevice.execute({ ...inviteInput, commandKey: 'revoke-first-binding' }),
  );
  const replacement = unwrap(
    await app.issueDriverInvite.execute({ ...inviteInput, commandKey: 'replacement-invite' }),
  );
  unwrap(
    await app.redeemDriverInvite.execute({
      ...redeem,
      token: replacement.url.split('#')[1],
      commandKey: 'replacement-binding',
    }),
  );
  expect(await app.redeemDriverInvite.execute(redeem)).toEqual({
    ok: false,
    error: { code: 'DEVICE_REVOKED' },
  });
});
