import { assert, describe, expect, it } from 'vitest';
import { Money } from '@domain/shared/money.value-object';
import { err, isOk, match } from '@domain/shared/result';

const readPaise = { ok: (money: Money) => money.paise, err: () => null };

describe('Money construction', () => {
  it('accepts zero and nonnegative safe integers in paise', () => {
    for (const paise of [0, 1, Number.MAX_SAFE_INTEGER]) {
      expect(match(Money.fromPaise(paise), readPaise)).toBe(paise);
    }
    expect(match(Money.fromPaise(-0), readPaise)).toBe(0);
  });

  it('rejects negative, fractional, unsafe and nonnumeric amounts', () => {
    for (const input of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
      expect(Money.fromPaise(input)).toEqual(err({ code: 'invalid_money_paise' }));
    }
  });
});

describe('Money arithmetic', () => {
  it('adds and multiplies exact paise without changing the original amount', () => {
    const fare = Money.fromPaise(1025);
    const adjustment = Money.fromPaise(75);
    assert(isOk(fare) && isOk(adjustment));

    expect(match(fare.value.add(adjustment.value), readPaise)).toBe(1100);
    expect(match(fare.value.multiplyBy(3), readPaise)).toBe(3075);
    expect(match(fare.value.multiplyBy(0), readPaise)).toBe(0);
    expect(fare.value.paise).toBe(1025);
  });

  it('rejects overflow and invalid multipliers', () => {
    const fare = Money.fromPaise(Number.MAX_SAFE_INTEGER);
    const adjustment = Money.fromPaise(1);
    assert(isOk(fare) && isOk(adjustment));

    const invalidPaise = err({ code: 'invalid_money_paise' });
    expect(fare.value.add(adjustment.value)).toEqual(invalidPaise);
    expect(fare.value.multiplyBy(2)).toEqual(invalidPaise);
    for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', null]) {
      expect(fare.value.multiplyBy(count)).toEqual(err({ code: 'invalid_money_multiplier' }));
    }
  });
});

it('formats Money with locale-specific grouping and digits while preserving exact paise', () => {
  const fare = Money.fromPaise(123456789);
  const maximumFare = Money.fromPaise(Number.MAX_SAFE_INTEGER);
  const smallFare = Money.fromPaise(5);
  assert(isOk(fare) && isOk(maximumFare) && isOk(smallFare));

  expect(fare.value.formatInr('en')).toBe('₹12,34,567.89');
  expect(fare.value.formatInr('hi')).toBe('₹12,34,567.89');
  expect(fare.value.formatInr('mr')).toBe('₹१,२३४,५६७.८९');
  expect(maximumFare.value.formatInr('en')).toBe('₹9,00,71,99,25,47,409.91');
  expect(smallFare.value.formatInr('en')).toBe('₹0.05');
  expect(smallFare.value.formatInr('mr')).toBe('₹०.०५');
});
