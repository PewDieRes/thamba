import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { Instant } from '@domain/shared/instant.value-object';
import { SystemClock } from '../clock/system-clock';
import { HmacInviteTokenGenerator } from '../memory/hmac-invite-token-generator';
import { InMemoryDriverNotifier } from '../memory/in-memory-driver-notifier';
import { InMemoryLogger } from '../memory/in-memory-logger';
import { InMemoryUnitOfWork } from '../memory/in-memory-unit-of-work';
import { RandomIdGenerator } from '../memory/random-id-generator';
import { Sha256CommandHasher } from '../memory/sha256-command-hasher';
import { InMemoryBookingRepository } from '../memory/in-memory-booking-repository';
import { InMemoryRideOfferRepository } from '../memory/in-memory-ride-offer-repository';
import { InMemoryDriverQueueRepository } from '../memory/in-memory-driver-queue-repository';
import { InMemoryStandRepository } from '../memory/in-memory-stand-repository';
import { InMemoryTownRepository } from '../memory/in-memory-town-repository';
import { InMemoryFareChartRepository } from '../memory/in-memory-fare-chart-repository';
import { InMemoryFareQuoteRepository } from '../memory/in-memory-fare-quote-repository';
import { InMemoryTripRepository } from '../memory/in-memory-trip-repository';
import { InMemoryDriverInviteRepository } from '../memory/in-memory-driver-invite-repository';
import { InMemoryDriverDeviceRepository } from '../memory/in-memory-driver-device-repository';
import { InMemoryCommandLog } from '../memory/in-memory-command-log';
import { InMemoryEventLog } from '../memory/in-memory-event-log';
import type { MemoryStore } from '../memory/memory-store';

import type { Database } from '../supabase/database.types';
import type { RepositoryStorage } from '../supabase/repository-storage';
import { SupabaseBookingRepository } from '../supabase/supabase-booking-repository';
import { SupabaseCommandLog } from '../supabase/supabase-command-log';
import { SupabaseDriverDeviceRepository } from '../supabase/supabase-driver-device-repository';
import { SupabaseDriverInviteRepository } from '../supabase/supabase-driver-invite-repository';
import { SupabaseDriverQueueRepository } from '../supabase/supabase-driver-queue-repository';
import { SupabaseEventLog } from '../supabase/supabase-event-log';
import { SupabaseFareChartRepository } from '../supabase/supabase-fare-chart-repository';
import { SupabaseFareQuoteRepository } from '../supabase/supabase-fare-quote-repository';
import { SupabaseRideOfferRepository } from '../supabase/supabase-ride-offer-repository';
import { SupabaseStandRepository } from '../supabase/supabase-stand-repository';
import { SupabaseStorage } from '../supabase/supabase-storage';
import type { CommandScope } from '../supabase/unit-of-work.mapper';
import { SupabaseTownRepository } from '../supabase/supabase-town-repository';
import { SupabaseTripRepository } from '../supabase/supabase-trip-repository';
import { SupabaseUnitOfWork } from '../supabase/supabase-unit-of-work';
import { domainValues } from './domain-values';
import { decodeInviteTokenSecret } from './invite-token.configuration';
import { createContainer, type ContainerPorts } from './use-case-wiring';

export { createContainer } from './use-case-wiring';

const IN_MEMORY_INVITE_TOKEN_SECRET = Buffer.from('thamba-in-memory-invite-token-test-secret');

export function createInMemoryContainer(overrides: Partial<ContainerPorts> = {}) {
  const unitOfWork = overrides.unitOfWork ?? new InMemoryUnitOfWork(createMemoryTransaction);
  const tokens = overrides.tokens ?? new HmacInviteTokenGenerator(IN_MEMORY_INVITE_TOKEN_SECRET);
  return createApplicationContainer(unitOfWork, { ...overrides, tokens });
}

function createApplicationContainer(
  unitOfWork: UnitOfWork,
  overrides: Partial<ContainerPorts> & Pick<ContainerPorts, 'tokens'>,
) {
  const notifier = overrides.notifier ?? new InMemoryDriverNotifier();
  const useCases = createContainer({
    unitOfWork,
    notifier,
    clock: overrides.clock ?? new SystemClock(toInstant),
    hasher: overrides.hasher ?? new Sha256CommandHasher(),
    ids: overrides.ids ?? new RandomIdGenerator(),
    logger: overrides.logger ?? new InMemoryLogger(),
    tokens: overrides.tokens,
  });
  return { ...useCases, unitOfWork, notifier };
}

function toInstant(milliseconds: number): Instant {
  const instant = Instant.fromEpochMilliseconds(milliseconds);
  if (!instant.ok) throw new RangeError('The system clock returned an invalid instant');
  return instant.value;
}

export function createMemoryTransaction({ tables }: MemoryStore): Transaction {
  return {
    bookings: new InMemoryBookingRepository(tables.bookings),
    offers: new InMemoryRideOfferRepository(tables.offers),
    drivers: new InMemoryDriverQueueRepository(tables.drivers),
    stands: new InMemoryStandRepository(tables.stands),
    towns: new InMemoryTownRepository(tables.towns),
    fareCharts: new InMemoryFareChartRepository(tables.fareCharts),
    quotes: new InMemoryFareQuoteRepository(tables.quotes),
    trips: new InMemoryTripRepository(tables.trips),
    invites: new InMemoryDriverInviteRepository(tables.invites),
    devices: new InMemoryDriverDeviceRepository(tables.devices),
    commands: new InMemoryCommandLog(tables.commands),
    events: new InMemoryEventLog(tables.events),
  };
}

type SupabaseConfiguration = {
  readonly backend: 'supabase';
  readonly url: string;
  readonly serviceRoleKey: string;
  readonly commandScope?: CommandScope;
};

type StorageConfiguration =
  | { readonly backend: 'memory' }
  | (SupabaseConfiguration & { readonly inviteTokenSecret: string | undefined });

function readStorageConfiguration(): StorageConfiguration {
  if (process.env.NODE_ENV === 'test') return { backend: 'memory' };
  const {
    SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    INVITE_TOKEN_SECRET: inviteTokenSecret,
  } = process.env;
  if (!url || !serviceRoleKey) throw new Error('Missing server Supabase configuration');
  return { backend: 'supabase', url, serviceRoleKey, inviteTokenSecret };
}

export function createConfiguredContainer(
  configuration = readStorageConfiguration(),
  overrides: Partial<ContainerPorts> = {},
) {
  if (configuration.backend === 'memory') return createInMemoryContainer(overrides);
  const tokens = new HmacInviteTokenGenerator(
    decodeInviteTokenSecret(configuration.inviteTokenSecret),
  );
  return createApplicationContainer(createSupabasePersistence(configuration).unitOfWork, {
    ...overrides,
    tokens,
  });
}

export function createSupabasePersistence(configuration: SupabaseConfiguration) {
  const client = createClient<Database>(configuration.url, configuration.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const storage = new SupabaseStorage(client, configuration.commandScope);
  return {
    transaction: createSupabaseTransaction(storage),
    unitOfWork: new SupabaseUnitOfWork(storage, createSupabaseTransaction),
  };
}

function createSupabaseTransaction(storage: RepositoryStorage): Transaction {
  return {
    bookings: new SupabaseBookingRepository(storage, domainValues),
    offers: new SupabaseRideOfferRepository(storage, domainValues),
    drivers: new SupabaseDriverQueueRepository(storage),
    stands: new SupabaseStandRepository(storage),
    towns: new SupabaseTownRepository(storage, domainValues),
    fareCharts: new SupabaseFareChartRepository(storage, domainValues),
    quotes: new SupabaseFareQuoteRepository(storage, domainValues),
    trips: new SupabaseTripRepository(storage, domainValues),
    invites: new SupabaseDriverInviteRepository(storage, domainValues),
    devices: new SupabaseDriverDeviceRepository(storage, domainValues),
    commands: new SupabaseCommandLog(storage, domainValues),
    events: new SupabaseEventLog(storage, domainValues),
  };
}
