import { expect, test } from 'vitest';
import { createDemo, quoteInput } from '../../../../tests/unit/application/demo.fixtures';

test('QuoteFare applies its Demo Town rules', async () => {
  const app = await createDemo();
  expect(await app.quoteFare.execute(quoteInput)).toMatchObject({
    ok: true,
    value: { fareInPaise: 7000 },
  });
});
