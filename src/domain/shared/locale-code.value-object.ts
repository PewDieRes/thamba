import type { DomainError } from './domain.error';
import { err, ok } from './result';
import type { Result } from './result';

export type LocaleCode = 'mr' | 'hi' | 'en';
export type LocaleCodeError = DomainError<'invalid_locale_code'>;

export function parseLocaleCode(input: unknown): Result<LocaleCode, LocaleCodeError> {
  if (input === 'mr' || input === 'hi' || input === 'en') {
    return ok(input);
  }
  return err({ code: 'invalid_locale_code' });
}
