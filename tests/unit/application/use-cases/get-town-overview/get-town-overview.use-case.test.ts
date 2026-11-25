import { expect, test } from 'vitest';
import { createDemo } from '../../demo.fixtures';

test('GetTownOverview applies its Demo Town rules', async () => {
  const app = await createDemo();
  expect(await app.getTownOverview.execute({ slug: 'malvan' })).toMatchObject({
    ok: true,
    value: { name: 'Malvan', capability: { kind: 'information_only' } },
  });
});

test('GetTownOverview includes the public catalogue collections', async () => {
  const app = await createDemo();
  expect(await app.getTownOverview.execute({ slug: 'malvan' })).toMatchObject({
    ok: true,
    value: { landmarks: [], stands: [] },
  });
});
