import { expect, test } from 'vitest';
import { domainValues } from '@infrastructure/composition/domain-values';
import { fromFareChartRow, toFareChartRow } from '@infrastructure/supabase/fare-chart.mapper';
import { FARE_CHART } from '../../application/demo-data.fixtures';

test('round trips the fare chart row with its storage version', () => {
  const record = FARE_CHART;
  const row = { ...toFareChartRow(record), version: 4 };
  const { value, version } = fromFareChartRow(row, domainValues);
  expect({ value, version }).toEqual({ value: record, version: 4 });
  expect(value.routes.map(({ fare }) => fare.paise)).toEqual(
    FARE_CHART.routes.map(({ fare }) => fare.paise),
  );
});
