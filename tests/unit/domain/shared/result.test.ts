import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { DomainError } from '@domain/shared/domain.error';
import { err, flatMap, isErr, isOk, map, mapErr, match, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

type TestError = DomainError<'invalid_input' | 'out_of_range'>;

const failure: TestError = { code: 'invalid_input' };

describe('Result construction and matching', () => {
  it('constructs and narrows success and failure', () => {
    const success: Result<number, TestError> = ok(3);
    const rejected: Result<number, TestError> = err(failure);

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isErr(rejected)).toBe(true);
    expect(isOk(rejected)).toBe(false);
    if (isOk(success)) expectTypeOf(success.value).toEqualTypeOf<number>();
    if (isErr(rejected)) expectTypeOf(rejected.error).toEqualTypeOf<TestError>();
  });

  it('selects the matching handler', () => {
    const handlers = {
      ok: vi.fn((value: number) => value),
      err: vi.fn((error: TestError) => error.code),
    };

    expect(match(ok(3), handlers)).toBe(3);
    expect(match(err(failure), handlers)).toBe('invalid_input');
    expect(handlers.ok).toHaveBeenCalledExactlyOnceWith(3);
    expect(handlers.err).toHaveBeenCalledExactlyOnceWith(failure);
  });
});

describe('Result transformations', () => {
  it('maps values and preserves errors without calling the mapper', () => {
    const double = vi.fn((value: number) => value * 2);

    expect(map(ok(3), double)).toEqual(ok(6));
    expect(map(err(failure), double)).toEqual(err(failure));
    expect(double).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('maps errors and preserves values without calling the mapper', () => {
    const readCode = vi.fn((error: TestError) => error.code);

    expect(mapErr(err(failure), readCode)).toEqual(err('invalid_input'));
    expect(mapErr(ok(3), readCode)).toEqual(ok(3));
    expect(readCode).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('chains results and retains both possible error codes', () => {
    const check = vi.fn((value: number): Result<number, 'out_of_range'> =>
      value > 0 ? ok(value) : err('out_of_range'),
    );
    const start: Result<number, 'invalid_input'> = err('invalid_input');
    const result = flatMap(start, check);

    expectTypeOf(result).toEqualTypeOf<Result<number, 'invalid_input' | 'out_of_range'>>();
    expect(result).toEqual(err('invalid_input'));
    expect(check).not.toHaveBeenCalled();
    expect(flatMap(ok(3), check)).toEqual(ok(3));
    expect(flatMap(ok(0), check)).toEqual(err('out_of_range'));
  });
});
