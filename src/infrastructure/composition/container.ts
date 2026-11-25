import 'server-only';
import type { ActorContext } from '@application/ports/actor-context';
import type { CookieMethodsServer } from '@supabase/ssr';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { ACTIVE_BOOKING_STATUSES } from '@domain/dispatch/booking-status';
import { PostgresCoordinatorDashboardReader } from '../supabase/postgres-coordinator-dashboard-reader';
import { PostgresDemoComplaintWriter } from '../supabase/postgres-demo-complaint-writer';
import { buildCoordinatorDashboard, buildDemoComplaint } from './operations-wiring';
import { SystemClock } from '../clock/system-clock';
import { HmacInviteTokenGenerator } from '../memory/hmac-invite-token-generator';
import { InMemoryDriverNotifier } from '../memory/in-memory-driver-notifier';
import { InMemoryLogger } from '../memory/in-memory-logger';
import { InMemoryMatchedRiderContactReader } from '../memory/in-memory-matched-rider-contact-reader';
import { InMemoryUnitOfWork } from '../memory/in-memory-unit-of-work';
import { RandomIdGenerator } from '../memory/random-id-generator';
import { Sha256CommandHasher } from '../memory/sha256-command-hasher';
import { InMemoryDemoRunProvisioner } from '../memory/in-memory-demo-run-provisioner';
import { InMemoryDueBookings } from '../memory/in-memory-due-bookings';
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
import { PostgresRepositoryStorage } from '../supabase/postgres-repository-storage';
import { PostgresDemoRunProvisioner } from '../supabase/postgres-demo-run-provisioner';
import { PostgresDueBookings } from '../supabase/postgres-due-bookings';
import { PostgresSessionMembershipReader } from '../supabase/postgres-session-membership-reader';
import { PostgresCoordinatorDirectory } from '../supabase/postgres-coordinator-directory';
import { PostgresRequestRateLimit } from '../supabase/postgres-request-rate-limit';
import { PostgresMatchedRiderContactReader } from '../supabase/postgres-matched-rider-contact-reader';
import { PostgresRiderBookingReader } from '../supabase/postgres-rider-booking-reader';
import { SupabaseAuthSession } from '../supabase/supabase-auth-session';
import { sweepActorContext } from './security-wiring';
import { getPersistenceDefaults } from './persistence-defaults';
import { createAuthClient, createProvisioningClient, getDatabaseUrl } from './auth.configuration';
import { readStorageConfiguration, type SupabaseConfiguration } from './storage.configuration';
import { getPostgresConnection } from './postgres.configuration';
import type { RepositoryBackend, RepositoryStorage } from '../supabase/repository-storage';
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
import { SupabaseTownRepository } from '../supabase/supabase-town-repository';
import { SupabaseTripRepository } from '../supabase/supabase-trip-repository';
import { SupabaseUnitOfWork } from '../supabase/supabase-unit-of-work';
import { domainValues, toInstant } from './domain-values';
import { decodeInviteTokenSecret } from './invite-token.configuration';
import { createContainer, type ContainerPorts } from './use-case-wiring';
export {
  getRequestIp,
  logSweepCounts,
  sweepActorContext,
  verifySweepAuthorization,
} from './security-wiring';
export {
  buildCoordinatorSignIn,
  buildCompleteCoordinatorSignIn,
  buildStartAnonymousSession,
} from './use-case-wiring';
const IN_MEMORY_INVITE_TOKEN_SECRET = Buffer.from('thamba-in-memory-invite-token-test-secret');
export function createInMemoryContainer(overrides: Partial<ContainerPorts> = {}) {
  const memory = new InMemoryUnitOfWork(createMemoryTransaction);
  return createApplicationContainer(overrides.unitOfWork ?? memory, {
    demoRuns: new InMemoryDemoRunProvisioner(overrides.unitOfWork ?? memory),
    dueBookings: new InMemoryDueBookings(() => memory.listBookings(), domainValues.bookingDueAt),
    ...overrides,
    tokens: overrides.tokens ?? new HmacInviteTokenGenerator(IN_MEMORY_INVITE_TOKEN_SECRET),
  });
}
function createApplicationContainer(
  unitOfWork: UnitOfWork,
  overrides: Partial<ContainerPorts> & Pick<ContainerPorts, 'tokens'>,
) {
  const notifier = overrides.notifier ?? new InMemoryDriverNotifier();
  const clock = overrides.clock ?? new SystemClock(toInstant);
  const ports = { ...getPersistenceDefaults(unitOfWork), ...overrides };
  const useCases = createContainer({
    ...ports,
    unitOfWork,
    notifier,
    clock,
    matchedRiderContacts:
      overrides.matchedRiderContacts ??
      new InMemoryMatchedRiderContactReader({ unitOfWork, clock }),
    hasher: overrides.hasher ?? new Sha256CommandHasher(),
    ids: overrides.ids ?? new RandomIdGenerator(),
    logger: overrides.logger ?? new InMemoryLogger(),
  });
  return { ...useCases, unitOfWork, notifier, demoRuns: ports.demoRuns };
}
export function createMemoryTransaction({ tables }: MemoryStore): Transaction {
  return {
    bookings: new InMemoryBookingRepository(tables.bookings, ACTIVE_BOOKING_STATUSES),
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
export function createConfiguredContainer(
  configuration = readStorageConfiguration(),
  overrides: Partial<ContainerPorts> = {},
) {
  if (configuration.backend === 'memory') return createInMemoryContainer(overrides);
  const secret = decodeInviteTokenSecret(configuration.inviteTokenSecret);
  const tokens = new HmacInviteTokenGenerator(secret);
  if (configuration.backend === 'supabase') {
    return createApplicationContainer(createSupabasePersistence(configuration).unitOfWork, {
      ...overrides,
      tokens,
    });
  }
  const { actorContext } = overrides;
  if (!configuration.writerUrl || !actorContext)
    throw new Error('Missing scoped Postgres configuration');
  const writer = getPostgresConnection(configuration.writerUrl);
  const storage = new PostgresRepositoryStorage(writer, actorContext);
  const dueBookings = configuration.sweepUrl
    ? new PostgresDueBookings(getPostgresConnection(configuration.sweepUrl))
    : undefined;
  return createApplicationContainer(createPersistence(storage).unitOfWork, {
    demoRuns: new PostgresDemoRunProvisioner(writer),
    matchedRiderContacts: new PostgresMatchedRiderContactReader(() => connect('reader')),
    ...(dueBookings ? { dueBookings } : {}),
    ...overrides,
    tokens,
  });
}
export function createDispatchSweepContainer() {
  const configuration = readStorageConfiguration('sweep');
  return createConfiguredContainer(configuration, { actorContext: sweepActorContext });
}
export function createSupabasePersistence(configuration: SupabaseConfiguration) {
  const client = createProvisioningClient(configuration);
  return createPersistence(new SupabaseStorage(client, configuration.commandScope));
}
function createPersistence(storage: RepositoryBackend) {
  const unitOfWork = new SupabaseUnitOfWork(storage, createSupabaseTransaction);
  return { unitOfWork, transaction: createSupabaseTransaction(storage) };
}
export function createAuthSession(cookies: CookieMethodsServer) {
  const memberships = new PostgresSessionMembershipReader(connect('reader'));
  return new SupabaseAuthSession(createAuthClient(cookies), memberships);
}
export function createRiderBookingReader(session: ActorContext) {
  return new PostgresRiderBookingReader(connect('reader'), session, domainValues);
}
export const createCoordinatorDirectory = () => new PostgresCoordinatorDirectory(connect('reader'));
export function createCoordinatorDashboard(actors: ActorContext) {
  const reader = new PostgresCoordinatorDashboardReader(connect('reader'));
  return buildCoordinatorDashboard({ actors, reader, clock: new SystemClock(toInstant) });
}
export function createDemoComplaint(actorContext: ActorContext) {
  const complaints = new PostgresDemoComplaintWriter(connect('writer'));
  return buildDemoComplaint({ actorContext, complaints, clock: new SystemClock(toInstant) });
}
export function createRequestRateLimit() {
  return new PostgresRequestRateLimit(connect('writer'));
}
function connect(role: Parameters<typeof getDatabaseUrl>[0]) {
  return getPostgresConnection(getDatabaseUrl(role));
}
function createSupabaseTransaction(storage: RepositoryStorage): Transaction {
  return {
    bookings: new SupabaseBookingRepository(storage, domainValues, ACTIVE_BOOKING_STATUSES),
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
