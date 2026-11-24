import { describe, expect, it } from 'vitest';
import { Duration } from '@domain/shared/duration.value-object';
import { err, match } from '@domain/shared/result';

describe('Duration', () => {
  it('accepts zero and positive safe integer milliseconds', () => {
    for (const milliseconds of [0, 1, Number.MAX_SAFE_INTEGER]) {
      expect(
        match(Duration.fromMilliseconds(milliseconds), {
          ok: (duration) => duration.milliseconds,
          err: () => null,
        }),
      ).toBe(milliseconds);
    }
  });

  it('rejects negative, fractional, unsafe and nonnumeric milliseconds', () => {
    for (const input of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
      expect(Duration.fromMilliseconds(input)).toEqual(err({ code: 'invalid_duration' }));
    }
  });
});
