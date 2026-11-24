import { describe, expect, it } from 'vitest';
import { parseLocaleCode } from '@domain/shared/locale-code.value-object';
import { err, ok } from '@domain/shared/result';

describe('LocaleCode', () => {
  it('accepts Marathi, Hindi and English locale codes', () => {
    for (const locale of ['mr', 'hi', 'en']) {
      expect(parseLocaleCode(locale)).toEqual(ok(locale));
    }
  });

  it('rejects unsupported locales, variants and non-strings', () => {
    for (const input of ['', 'fr', 'MR', 'en-IN', ' hi ', null]) {
      expect(parseLocaleCode(input)).toEqual(err({ code: 'invalid_locale_code' }));
    }
  });
});
