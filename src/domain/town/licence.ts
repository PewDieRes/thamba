import type { DomainError } from '../shared/domain.error';
import { Instant } from '../shared/instant.value-object';
import { getKolkataMidnight } from '../shared/kolkata-time';
import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;
const MILLISECONDS_PER_DAY = 86_400_000;
const LICENCE_BRAND = Symbol('Licence');

export interface Licence {
  readonly [LICENCE_BRAND]: true;
  readonly ulin: string;
  readonly issuingAuthority: string;
  readonly startsAt: Instant;
  readonly endsAt: Instant;
}

interface LicenceInput {
  readonly ulin: string;
  readonly issuingAuthority: string;
  readonly validFromDate: string;
  readonly validThroughDate: string;
}

type LicenceError = DomainError<'invalid_licence'>;

export function createLicence(input: LicenceInput): Result<Licence, LicenceError> {
  const { ulin, issuingAuthority } = input;
  const validFrom = parseUtcMidnight(input.validFromDate);
  const validThrough = parseUtcMidnight(input.validThroughDate);
  if (!ulin.trim() || !issuingAuthority.trim() || validFrom > validThrough) {
    return err({ code: 'invalid_licence' });
  }

  const startsAt = Instant.fromEpochMilliseconds(getKolkataMidnight(validFrom));
  const endsAt = Instant.fromEpochMilliseconds(
    getKolkataMidnight(validThrough + MILLISECONDS_PER_DAY),
  );
  if (!startsAt.ok || !endsAt.ok) return err({ code: 'invalid_licence' });
  const licence: Licence = {
    [LICENCE_BRAND]: true,
    ulin,
    issuingAuthority,
    startsAt: startsAt.value,
    endsAt: endsAt.value,
  };
  return ok(Object.freeze(licence));
}

function parseUtcMidnight(date: string): number {
  if (!ISO_DATE_PATTERN.test(date)) return Number.NaN;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const milliseconds = parsed.getTime();
  if (Number.isNaN(milliseconds) || parsed.toISOString().slice(0, ISO_DATE_LENGTH) !== date) {
    return Number.NaN;
  }
  return milliseconds;
}
