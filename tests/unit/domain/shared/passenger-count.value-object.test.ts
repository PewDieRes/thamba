import { describe, expect, it } from 'vitest';
import { PassengerCount } from '@domain/shared/passenger-count.value-object';
import { err, match } from '@domain/shared/result';

const readCount = { ok: (passengerCount: PassengerCount) => passengerCount.count, err: () => null };

describe('PassengerCount', () => {
  it('accepts one to three passengers by default', () => {
    for (const count of [1, 2, 3]) {
      expect(match(PassengerCount.fromCount(count), readCount)).toBe(count);
    }
  });

  it('honors a smaller or larger configured maximum', () => {
    expect(match(PassengerCount.fromCount(4, 4), readCount)).toBe(4);
    expect(match(PassengerCount.fromCount(1, 1), readCount)).toBe(1);
    expect(PassengerCount.fromCount(2, 1)).toEqual(err({ code: 'invalid_passenger_count' }));
  });

  it('rejects invalid counts and maxima with distinct error codes', () => {
    for (const input of [-1, 0, 1.5, 4, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
      expect(PassengerCount.fromCount(input)).toEqual(err({ code: 'invalid_passenger_count' }));
    }
    for (const maximum of [-1, 0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3', null]) {
      expect(PassengerCount.fromCount(1, maximum)).toEqual(
        err({ code: 'invalid_max_passenger_count' }),
      );
    }
  });
});
