import { expect, test } from 'vitest';
import { createDemo, unwrap, inviteInput, NEW_SUBJECT, OTHER_SUBJECT } from '../../demo.fixtures';

test('RedeemDriverInvite applies its Demo Town rules', async () => {
  const app = await createDemo();
  const invite = unwrap(await app.issueDriverInvite.execute(inviteInput));
  const input = { subject: NEW_SUBJECT, token: invite.token, commandKey: 'redeem' };
  expect(await app.redeemDriverInvite.execute(input)).toMatchObject({
    ok: true,
    value: { driverId: inviteInput.driverId, status: 'active' },
  });
  expect(await app.redeemDriverInvite.execute({ ...input, subject: OTHER_SUBJECT })).toMatchObject({
    ok: false,
    error: { code: 'INVITE_ALREADY_REDEEMED' },
  });
});
