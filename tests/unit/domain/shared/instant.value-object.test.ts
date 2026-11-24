import { assert, describe, expect, it } from 'vitest';
import { Duration } from '@domain/shared/duration.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { err, isOk, match } from '@domain/shared/result';

describe('Instant', () => {
  it('accepts signed safe UTC epoch milliseconds', () => {
    for (const epochMilliseconds of [-1, 0, 1000, Number.MAX_SAFE_INTEGER]) {
      const result = Instant.fromEpochMilliseconds(epochMilliseconds);

      expect(match(result, { ok: (instant) => instant.epochMilliseconds, err: () => null })).toBe(
        epochMilliseconds,
      );
    }
  });

  it('rejects fractional, unsafe and nonnumeric milliseconds', () => {
    for (const input of [1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null]) {
      expect(Instant.fromEpochMilliseconds(input)).toEqual(err({ code: 'invalid_instant' }));
    }
  });

  it('adds a duration and compares instants just before, at and after a deadline', () => {
    const start = Instant.fromEpochMilliseconds(1000);
    const after = Instant.fromEpochMilliseconds(1002);
    const duration = Duration.fromMilliseconds(1);
    assert(isOk(start) && isOk(after) && isOk(duration));
    const deadline = start.value.plus(duration.value);
    assert(isOk(deadline));

    expect(deadline.value.epochMilliseconds).toBe(1001);
    expect(start.value.epochMilliseconds).toBe(1000);
    expect(start.value.isBefore(deadline.value)).toBe(true);
    expect(start.value.isAtOrAfter(deadline.value)).toBe(false);
    expect(deadline.value.isBefore(deadline.value)).toBe(false);
    expect(deadline.value.isAtOrAfter(deadline.value)).toBe(true);
    expect(after.value.isAtOrAfter(deadline.value)).toBe(true);
  });

  it('rejects overflow when adding a duration', () => {
    const start = Instant.fromEpochMilliseconds(Number.MAX_SAFE_INTEGER);
    const duration = Duration.fromMilliseconds(1);
    assert(isOk(start) && isOk(duration));
    expect(start.value.plus(duration.value)).toEqual(err({ code: 'invalid_instant' }));
  });
});
