import postgres, { type Sql } from 'postgres';
import { expect, test } from 'vitest';
import { getScopedConfiguration } from './scoped-database.fixtures';

const DEMO_TOWN = '00000000-0000-0000-0000-000000000001';
const MALVAN = '00000000-0000-0000-0000-000000000002';
const SUBJECT = '60000000-0000-4000-8000-000000000001';

export function registerPostgresScopeTests() {
  test('clears actor and Town settings on a reused connection after a read and a rejected write', async () => {
    const db = postgres(getScopedConfiguration().writerUrl, { max: 1, prepare: false });
    try {
      const [{ revision } = { revision: '' }] = await db<{ revision: string }[]>`
        select public.thamba_repository_revision() as revision
      `;
      const demo = await readTown(db, { townId: DEMO_TOWN, revision });
      expect(demo).toHaveLength(1);
      await expectCleanConnection(db);

      await expect(rejectScopedWrite(db, revision)).rejects.toMatchObject({ code: '42501' });
      await expectCleanConnection(db);

      const malvan = await readTown(db, { townId: MALVAN, revision });
      expect(malvan).toHaveLength(1);
      expect(await readTown(db, { townId: MALVAN, requestedId: DEMO_TOWN, revision })).toEqual([]);
    } finally {
      await db.end();
    }
  });
}

async function readTown(
  db: Sql,
  {
    townId,
    requestedId = townId,
    revision,
  }: {
    townId: string;
    requestedId?: string;
    revision: string;
  },
) {
  const [row] = await db<{ towns: unknown[] }[]>`
    select public.thamba_scoped_repository_list('towns', ${db.json({ id: requestedId })}, ${revision},
      ${db.json({ target: { kind: 'town', townId }, actor_kind: 'anonymous', actor_subject: SUBJECT })}
    ) as towns
  `;
  return row?.towns;
}

async function rejectScopedWrite(db: Sql, revision: string) {
  await db`
    select public.thamba_scoped_repository_commit(
      ${db.json([{ resource: 'towns', row: { id: DEMO_TOWN }, expectedVersion: 1 }])},
      ${revision},
      ${db.json({
        town_id: DEMO_TOWN,
        demo_run_id: null,
        stand_ids: [],
        actor_kind: 'anonymous',
        actor_subject: SUBJECT,
      })}
    )
  `;
}

async function expectCleanConnection(db: Sql) {
  const [settings] = await db`
    select nullif(current_setting('request.jwt.claims', true), '') as claims,
      nullif(current_setting('thamba.town_id', true), '') as town,
      nullif(current_setting('thamba.actor_subject', true), '') as subject,
      nullif(current_setting('thamba.stand_ids', true), '') as stands
  `;
  expect(settings).toEqual({ claims: null, town: null, subject: null, stands: null });
}
