import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromTownRow, toTownRow } from '@infrastructure/supabase/town.mapper';
import { createLicence } from '@domain/town/licence';
import { Town } from '@domain/town/town';
import { DEMO_TOWN, TOWN } from '../../application/demo-data.fixtures';
import { unwrap } from '../../domain/dispatch/booking.fixtures';

test('keeps the stored booking mode and inclusive Kolkata licence dates', () => {
  const licence = unwrap(
    createLicence({
      ulin: 'test-ulin',
      issuingAuthority: 'Test authority',
      validFromDate: '2026-11-24',
      validThroughDate: '2026-11-30',
    }),
  );
  const record = { ...DEMO_TOWN, town: Town.restore({ townId: TOWN, licence }, 'live') };
  const row = { ...toTownRow(record), version: 5 };
  expect(row.licence?.valid_from_date).toBe('2026-11-24');
  expect(row.licence?.valid_through_date).toBe('2026-11-30');
  const restored = fromTownRow(row, domainValues);
  expect(restored).toEqual({ version: 5, value: record });
  expect(restored.value.town.licence?.endsAt.epochMilliseconds).toBe(
    licence.endsAt.epochMilliseconds,
  );
});
