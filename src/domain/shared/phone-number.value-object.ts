import type { DomainError } from './domain.error';
import { err, ok } from './result';
import type { Result } from './result';

const INDIA_COUNTRY_CODE = '+91';
const INDIAN_MOBILE_PATTERN = /^(?:\+?91|0)?([6-9][0-9]{9})$/;
const VISIBLE_PHONE_DIGITS = 4;

export type PhoneNumberError = DomainError<'invalid_phone_number'>;

export class PhoneNumber {
  readonly #e164: string;

  private constructor(e164: string) {
    this.#e164 = e164;
  }

  static fromString(input: unknown): Result<PhoneNumber, PhoneNumberError> {
    if (typeof input !== 'string') {
      return err({ code: 'invalid_phone_number' });
    }
    const mobile = INDIAN_MOBILE_PATTERN.exec(input.trim().replace(/[ -]/g, ''))?.[1];
    return mobile
      ? ok(new PhoneNumber(`${INDIA_COUNTRY_CODE}${mobile}`))
      : err({ code: 'invalid_phone_number' });
  }

  get e164(): string {
    return this.#e164;
  }

  masked(): string {
    return `${INDIA_COUNTRY_CODE}-XXXXX-X${this.#e164.slice(-VISIBLE_PHONE_DIGITS)}`;
  }
}
