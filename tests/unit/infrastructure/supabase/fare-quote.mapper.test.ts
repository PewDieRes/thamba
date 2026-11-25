import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromFareQuoteRow, toFareQuoteRow } from '@infrastructure/supabase/fare-quote.mapper';
import { QUOTE, QUOTE_ID, DEADLINE } from '../../../contract/contract-data.fixtures';

test('round trips the fare quote row with its storage version', () => {
  const record = { quote: QUOTE, quoteId: QUOTE_ID, pickupAt: DEADLINE };
  const row = { ...toFareQuoteRow(record), version: 4 };
  const { value, version } = fromFareQuoteRow(row, domainValues);
  expect({ value, version }).toEqual({ value: record, version: 4 });
  expect(value.quote.amount.paise).toBe(QUOTE.amount.paise);
});
