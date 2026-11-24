import { describe, expect, it } from 'vitest';
import { PhoneNumber } from '@domain/shared/phone-number.value-object';
import { err, isOk } from '@domain/shared/result';

describe('PhoneNumber', () => {
  it('normalizes local and country-prefixed Indian mobile inputs and masks the result', () => {
    for (const input of ['6000001234', '06000001234', '916000001234', ' +91 60000-01234 ']) {
      const result = PhoneNumber.fromString(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.e164 === '+916000001234').toBe(true);
        expect(result.value.masked()).toBe('+91-XXXXX-X1234');
      }
    }
  });

  it('rejects invalid prefixes, lengths, characters and input types', () => {
    const invalidInputs = [
      '+1 6000001234',
      '5000001234',
      '600000123',
      '60000012345',
      '6000001234x1',
      '+9106000001234',
      6000001234,
      null,
    ];

    for (const input of invalidInputs) {
      expect(PhoneNumber.fromString(input)).toEqual(err({ code: 'invalid_phone_number' }));
    }
  });
});
