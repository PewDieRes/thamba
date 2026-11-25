import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromRideOfferRow, toRideOfferRow } from '@infrastructure/supabase/ride-offer.mapper';
import { OFFER, DEADLINE } from '../../../contract/contract-data.fixtures';
import { SCOPE } from '../../application/demo-data.fixtures';

test('round trips the ride offer row with its storage version', () => {
  const record = { ...SCOPE, status: 'pending' as const, offer: OFFER };
  const row = { ...toRideOfferRow(record), version: 4 };
  const { value, version } = fromRideOfferRow(row, domainValues);
  expect({ value, version }).toEqual({ value: record, version: 4 });
  expect(value.offer.isExpired(DEADLINE)).toBe(true);
});
