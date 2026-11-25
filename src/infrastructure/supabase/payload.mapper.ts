import type { Instant } from '@domain/shared/instant.value-object';
import type { Money } from '@domain/shared/money.value-object';
import type { Json } from './database.types';
import type { DomainValues } from './domain-values';
import { unpack } from './row.mapper';

export interface PayloadValues extends DomainValues {
  readonly isInstant: (value: object) => value is Instant;
  readonly isMoney: (value: object) => value is Money;
}

const TYPE_FIELD = '$thamba';

export function writePayload(value: unknown, domain: PayloadValues): Json {
  if (value === undefined) return { [TYPE_FIELD]: 'undefined' };
  if (typeof value === 'bigint') return { [TYPE_FIELD]: 'bigint', value: value.toString() };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object') throw new Error('Unsupported persisted payload');
  return writeObject(value, domain);
}

function writeObject(value: object, domain: PayloadValues): Json {
  if (domain.isInstant(value)) return { [TYPE_FIELD]: 'instant', value: value.epochMilliseconds };
  if (domain.isMoney(value)) return { [TYPE_FIELD]: 'money', value: value.paise };
  if (Array.isArray(value)) return value.map((entry: unknown) => writePayload(entry, domain));
  return writeRecordPayload(value, domain);
}

export function writeRecordPayload(value: object, domain: PayloadValues): Record<string, Json> {
  const fields = Object.fromEntries(
    Object.entries(value).map(([key, entry]: [string, unknown]) => [
      key,
      writePayload(entry, domain),
    ]),
  );
  return Object.hasOwn(fields, TYPE_FIELD) ? { [TYPE_FIELD]: 'object', value: fields } : fields;
}

export function readPayload(value: Json | undefined, domain: DomainValues): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((entry) => readPayload(entry, domain));
  switch (value[TYPE_FIELD]) {
    case 'undefined':
      return undefined;
    case 'instant':
      return unpack(domain.instant(value.value));
    case 'money':
      return unpack(domain.money(value.value));
    case 'bigint':
      return readBigint(value.value);
    case 'object':
      return readObject(value.value, domain);
    default:
      return readFields(value, domain);
  }
}

function readFields(value: { [key: string]: Json | undefined }, domain: DomainValues) {
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [key, readPayload(field, domain)]),
  );
}

function readBigint(value: Json | undefined): bigint {
  if (typeof value !== 'string') throw new Error('Invalid bigint payload');
  return BigInt(value);
}

function readObject(value: Json | undefined, domain: DomainValues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid object payload');
  }
  return readFields(value, domain);
}
