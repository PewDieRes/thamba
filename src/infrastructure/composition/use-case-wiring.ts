import { GetDriverState } from '@application/use-cases/get-driver-state/get-driver-state.use-case';
import { createGetDriverStateSchema } from '@application/use-cases/get-driver-state/get-driver-state.input';
import type { MatchedRiderContactReader } from '@application/ports/matched-rider-contact-reader';
import type { DispatchAdvancer } from '@application/ports/dispatch-advancer';
import { StartAnonymousSession } from '@application/use-cases/start-anonymous-session/start-anonymous-session.use-case';
import { createStartAnonymousSessionSchema } from '@application/use-cases/start-anonymous-session/start-anonymous-session.input';
import { StartDemoRun } from '@application/use-cases/start-demo-run/start-demo-run.use-case';
import { createStartDemoRunSchema } from '@application/use-cases/start-demo-run/start-demo-run.input';
import type { AuthSession } from '@application/ports/auth-session';
import type { DemoRunProvisioner } from '@application/ports/demo-run-provisioner';
import { CoordinatorSignIn } from '@application/use-cases/coordinator-sign-in/coordinator-sign-in.use-case';
import { createCoordinatorSignInSchema } from '@application/use-cases/coordinator-sign-in/coordinator-sign-in.input';
import { CompleteCoordinatorSignIn } from '@application/use-cases/complete-coordinator-sign-in/complete-coordinator-sign-in.use-case';
import { createCompleteCoordinatorSignInSchema } from '@application/use-cases/complete-coordinator-sign-in/complete-coordinator-sign-in.input';
import type { InputSchemaFactory } from '@application/contracts/input-schema';
import { CommandExecutor, type CommandDependencies } from '@application/operations/execute-command';
import type { RiderBookingReader } from '@application/ports/rider-booking-reader';
import type { DueBookings } from '@application/ports/due-bookings';
import type { Clock } from '@application/ports/clock';
import type { IdGenerator } from '@application/ports/id-generator';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';
import { SweepDispatch } from '@application/use-cases/sweep-dispatch/sweep-dispatch.use-case';
import { createSweepDispatchSchema } from '@application/use-cases/sweep-dispatch/sweep-dispatch.input';
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
import { zodInputSchema } from './zod-input-schema';

export interface ContainerPorts extends CommandDependencies {
  readonly matchedRiderContacts: MatchedRiderContactReader;
  readonly demoRuns: DemoRunProvisioner;
  readonly demoSession?: Pick<AuthSession, 'ensureAnonymous'>;
  readonly riderBookings: RiderBookingReader;
  readonly riderDispatchAdvancer?: DispatchAdvancer;
  readonly dueBookings: DueBookings;
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
  const advanceDispatch = new AdvanceDispatch(dependencies, schema(createAdvanceDispatchSchema));
  return {
    startDemoRun: new StartDemoRun(ports, schema(createStartDemoRunSchema)),
    quoteFare: new QuoteFare(dependencies, schema(createQuoteFareSchema)),
    requestRide: new RequestRide(dependencies, schema(createRequestRideSchema)),
    scheduleRide: new ScheduleRide(dependencies, schema(createScheduleRideSchema)),
    advanceDispatch,
    sweepDispatch: new SweepDispatch(
      { ...ports, advanceDispatch },
      schema(createSweepDispatchSchema),
    ),
    ...createDriverCommands(dependencies),
    getDriverState: new GetDriverState(dependencies, schema(createGetDriverStateSchema)),
    cancelBooking: new CancelBooking(dependencies, schema(createCancelBookingSchema)),
    getBookingStatusForRider: new GetBookingStatusForRider(
      {
        ...ports,
        ...(ports.riderDispatchAdvancer && { advanceDispatch: ports.riderDispatchAdvancer }),
      },
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

function createDriverCommands(
  dependencies: Parameters<typeof createIdentityCommands>[0] & {
    driverRanking: FairRotationPolicy;
    standFallback: ConfiguredNeighbourOrderPolicy;
    declinePenalty: MoveToBackOfQueuePolicy;
  },
) {
  return {
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
  };
}

export function buildCoordinatorSignIn(ports: ConstructorParameters<typeof CoordinatorSignIn>[0]) {
  return { requestLink: new CoordinatorSignIn(ports, schema(createCoordinatorSignInSchema)) };
}

export function buildCompleteCoordinatorSignIn(
  session: ConstructorParameters<typeof CompleteCoordinatorSignIn>[0],
) {
  return new CompleteCoordinatorSignIn(session, schema(createCompleteCoordinatorSignInSchema));
}

export function buildStartAnonymousSession(
  session: ConstructorParameters<typeof StartAnonymousSession>[0],
) {
  return new StartAnonymousSession(session, schema(createStartAnonymousSessionSchema));
}
