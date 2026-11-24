import type { InputSchemaFactory } from '@application/contracts/input-schema';
import { CommandExecutor, type CommandDependencies } from '@application/operations/execute-command';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';
import type { Transaction } from '@application/ports/unit-of-work';
import { QuoteFare } from '@application/use-cases/quote-fare/quote-fare.use-case';
import { createQuoteFareSchema } from '@application/use-cases/quote-fare/quote-fare.input';
import { RequestRide } from '@application/use-cases/request-ride/request-ride.use-case';
import { createRequestRideSchema } from '@application/use-cases/request-ride/request-ride.input';
import { ScheduleRide } from '@application/use-cases/schedule-ride/schedule-ride.use-case';
import { createScheduleRideSchema } from '@application/use-cases/schedule-ride/schedule-ride.input';
import { AdvanceDispatch } from '@application/use-cases/advance-dispatch/advance-dispatch.use-case';
import { createAdvanceDispatchSchema } from '@application/use-cases/advance-dispatch/advance-dispatch.input';
import { RespondToRideOffer } from '@application/use-cases/respond-to-ride-offer/respond-to-ride-offer.use-case';
import { createRespondToRideOfferSchema } from '@application/use-cases/respond-to-ride-offer/respond-to-ride-offer.input';
import { SetDriverAvailability } from '@application/use-cases/set-driver-availability/set-driver-availability.use-case';
import { createSetDriverAvailabilitySchema } from '@application/use-cases/set-driver-availability/set-driver-availability.input';
import { RejoinQueue } from '@application/use-cases/rejoin-queue/rejoin-queue.use-case';
import { createRejoinQueueSchema } from '@application/use-cases/rejoin-queue/rejoin-queue.input';
import { MarkDriverArrived } from '@application/use-cases/mark-driver-arrived/mark-driver-arrived.use-case';
import { createMarkDriverArrivedSchema } from '@application/use-cases/mark-driver-arrived/mark-driver-arrived.input';
import { StartTrip } from '@application/use-cases/start-trip/start-trip.use-case';
import { createStartTripSchema } from '@application/use-cases/start-trip/start-trip.input';
import { CompleteTrip } from '@application/use-cases/complete-trip/complete-trip.use-case';
import { createCompleteTripSchema } from '@application/use-cases/complete-trip/complete-trip.input';
import { CancelBooking } from '@application/use-cases/cancel-booking/cancel-booking.use-case';
import { createCancelBookingSchema } from '@application/use-cases/cancel-booking/cancel-booking.input';
import { GetBookingStatusForRider } from '@application/use-cases/get-booking-status-for-rider/get-booking-status-for-rider.use-case';
import { createGetBookingStatusForRiderSchema } from '@application/use-cases/get-booking-status-for-rider/get-booking-status-for-rider.input';
import { GetPendingOfferForDriver } from '@application/use-cases/get-pending-offer-for-driver/get-pending-offer-for-driver.use-case';
import { createGetPendingOfferForDriverSchema } from '@application/use-cases/get-pending-offer-for-driver/get-pending-offer-for-driver.input';
import { IssueDriverInvite } from '@application/use-cases/issue-driver-invite/issue-driver-invite.use-case';
import { createIssueDriverInviteSchema } from '@application/use-cases/issue-driver-invite/issue-driver-invite.input';
import { RedeemDriverInvite } from '@application/use-cases/redeem-driver-invite/redeem-driver-invite.use-case';
import { createRedeemDriverInviteSchema } from '@application/use-cases/redeem-driver-invite/redeem-driver-invite.input';
import { RevokeDriverDevice } from '@application/use-cases/revoke-driver-device/revoke-driver-device.use-case';
import { createRevokeDriverDeviceSchema } from '@application/use-cases/revoke-driver-device/revoke-driver-device.input';
import { GetTownOverview } from '@application/use-cases/get-town-overview/get-town-overview.use-case';
import { createGetTownOverviewSchema } from '@application/use-cases/get-town-overview/get-town-overview.input';
import { ConfiguredNeighbourOrderPolicy } from '@domain/dispatch/configured-neighbour-order.policy';
import { FairRotationPolicy } from '@domain/dispatch/fair-rotation.policy';
import { MoveToBackOfQueuePolicy } from '@domain/dispatch/move-to-back-of-queue.policy';
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
import { zodInputSchema } from './zod-input-schema';

interface ContainerPorts extends CommandDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly tokens: InviteTokenGenerator;
}

function schema<T>(create: (factory: InputSchemaFactory) => T): T {
  return create(zodInputSchema);
}

export function createContainer(ports: ContainerPorts) {
  const dependencies = {
    ...ports,
    commands: new CommandExecutor(ports),
    driverRanking: new FairRotationPolicy(),
    standFallback: new ConfiguredNeighbourOrderPolicy(),
    declinePenalty: new MoveToBackOfQueuePolicy(),
  };
  return {
    quoteFare: new QuoteFare(dependencies, schema(createQuoteFareSchema)),
    requestRide: new RequestRide(dependencies, schema(createRequestRideSchema)),
    scheduleRide: new ScheduleRide(dependencies, schema(createScheduleRideSchema)),
    advanceDispatch: new AdvanceDispatch(dependencies, schema(createAdvanceDispatchSchema)),
    respondToRideOffer: new RespondToRideOffer(
      dependencies,
      schema(createRespondToRideOfferSchema),
    ),
    setDriverAvailability: new SetDriverAvailability(
      dependencies,
      schema(createSetDriverAvailabilitySchema),
    ),
    rejoinQueue: new RejoinQueue(dependencies, schema(createRejoinQueueSchema)),
    markDriverArrived: new MarkDriverArrived(dependencies, schema(createMarkDriverArrivedSchema)),
    startTrip: new StartTrip(dependencies, schema(createStartTripSchema)),
    completeTrip: new CompleteTrip(dependencies, schema(createCompleteTripSchema)),
    cancelBooking: new CancelBooking(dependencies, schema(createCancelBookingSchema)),
    getBookingStatusForRider: new GetBookingStatusForRider(
      ports,
      schema(createGetBookingStatusForRiderSchema),
    ),
    getPendingOfferForDriver: new GetPendingOfferForDriver(
      ports,
      schema(createGetPendingOfferForDriverSchema),
    ),
    ...createIdentityCommands(dependencies),
    getTownOverview: new GetTownOverview(ports, schema(createGetTownOverviewSchema)),
  };
}

function createIdentityCommands(
  dependencies: ContainerPorts & { readonly commands: CommandExecutor },
) {
  return {
    issueDriverInvite: new IssueDriverInvite(dependencies, schema(createIssueDriverInviteSchema)),
    redeemDriverInvite: new RedeemDriverInvite(
      dependencies,
      schema(createRedeemDriverInviteSchema),
    ),
    revokeDriverDevice: new RevokeDriverDevice(
      dependencies,
      schema(createRevokeDriverDeviceSchema),
    ),
  };
}

export function createInMemoryContainer(overrides: Partial<ContainerPorts> = {}) {
  const unitOfWork = overrides.unitOfWork ?? new InMemoryUnitOfWork(createMemoryTransaction);
  const notifier = overrides.notifier ?? new InMemoryDriverNotifier();
  const useCases = createContainer({
    unitOfWork,
    notifier,
    clock: overrides.clock ?? new SystemClock(toInstant),
    hasher: overrides.hasher ?? new Sha256CommandHasher(),
    ids: overrides.ids ?? new RandomIdGenerator(),
    logger: overrides.logger ?? new InMemoryLogger(),
    tokens: overrides.tokens ?? new HmacInviteTokenGenerator(),
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
