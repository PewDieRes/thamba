import { expect, test } from 'vitest';
import { createDemo, inviteInput } from '../../demo.fixtures';

test('IssueDriverInvite applies its Demo Town rules', async () => {
  const app = await createDemo();
  expect(await app.issueDriverInvite.execute(inviteInput)).toMatchObject({
    ok: true,
    value: { token: expect.any(String) as unknown },
  });
});
