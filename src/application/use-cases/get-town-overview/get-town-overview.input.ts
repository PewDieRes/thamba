import type { InputOf, InputSchemaFactory } from '@application/contracts/input-schema';

const MAX_TOWN_SLUG_LENGTH = 128;

export function createGetTownOverviewSchema(schema: InputSchemaFactory) {
  return schema.object({
    slug: schema.text(MAX_TOWN_SLUG_LENGTH),
  });
}

export type GetTownOverviewInput = InputOf<typeof createGetTownOverviewSchema>;
