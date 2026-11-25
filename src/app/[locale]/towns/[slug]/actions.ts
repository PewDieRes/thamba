'use server';

import { createConfiguredContainer } from '@infrastructure/composition/container';
import { z } from 'zod';

const MAX_SLUG_LENGTH = 128;
const slugSchema = z
  .string()
  .max(MAX_SLUG_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function readTownOverview(slug: string) {
  if (!slugSchema.safeParse(slug).success)
    return { ok: false, error: { code: 'not_found' } } as const;
  const actorContext = { getActor: () => Promise.resolve(undefined) };
  return createConfiguredContainer(undefined, { actorContext }).getTownOverview.execute({ slug });
}
