import type { DomainError } from './domain.error';
import { isSafeInteger } from './integer.validation';
import type { LocaleCode } from './locale-code.value-object';
import { err, ok } from './result';
import type { Result } from './result';

const PAISE_PER_RUPEE = 100n;
const INR_FRACTION_DIGITS = 2;

export type MoneyError = DomainError<'invalid_money_paise' | 'invalid_money_multiplier'>;

export class Money {
  readonly #paise: number;

  private constructor(paise: number) {
    this.#paise = paise;
  }

  static fromPaise(paise: unknown): Result<Money, MoneyError> {
    if (!isSafeInteger(paise) || paise < 0) {
      return err({ code: 'invalid_money_paise' });
    }
    return ok(new Money(paise === 0 ? 0 : paise));
  }

  get paise(): number {
    return this.#paise;
  }

  add(other: Money): Result<Money, MoneyError> {
    return Money.fromPaise(this.#paise + other.#paise);
  }

  multiplyBy(count: unknown): Result<Money, MoneyError> {
    if (!isSafeInteger(count) || count < 0) {
      return err({ code: 'invalid_money_multiplier' });
    }
    return Money.fromPaise(this.#paise * count);
  }

  formatInr(locale: LocaleCode): string {
    const regionalLocale = `${locale}-IN`;
    const paise = BigInt(this.#paise);
    const currency = new Intl.NumberFormat(regionalLocale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: INR_FRACTION_DIGITS,
      maximumFractionDigits: INR_FRACTION_DIGITS,
    });
    const fraction = new Intl.NumberFormat(regionalLocale, {
      minimumIntegerDigits: INR_FRACTION_DIGITS,
      useGrouping: false,
    }).format(paise % PAISE_PER_RUPEE);

    // Converting to fractional rupees as a number can lose paise for large amounts.
    return currency
      .formatToParts(paise / PAISE_PER_RUPEE)
      .map((part) => (part.type === 'fraction' ? fraction : part.value))
      .join('');
  }
}
