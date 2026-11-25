import type { CoordinatorDashboardView } from '@application/contracts/coordinator-dashboard-view';
import { validateInput, type InputSchema } from '@application/contracts/input-schema';
import type { ActorContext } from '@application/ports/actor-context';
import type { Clock } from '@application/ports/clock';
import type {
  CoordinatorDashboardReader,
  DashboardSnapshot,
} from '@application/ports/coordinator-dashboard-reader';
import { ACTIVE_BOOKING_STATUSES, type BookingStatus } from '@domain/dispatch/booking-status';
import { canIssueInvite } from '@domain/identity/driver-invite-eligibility';
import { err, ok } from '@domain/shared/result';
import type { GetCoordinatorDashboardInput } from './get-coordinator-dashboard.input';
import { rankQueue, replayQueue } from './queue-history';

const DAY_MILLISECONDS = 86_400_000;
const INDIA_OFFSET_MILLISECONDS = 19_800_000;
const liveStatuses = new Set<BookingStatus>(ACTIVE_BOOKING_STATUSES);

export class GetCoordinatorDashboard {
  constructor(
    private readonly ports: {
      actors: ActorContext;
      reader: CoordinatorDashboardReader;
      clock: Clock;
    },
    private readonly schema: InputSchema<GetCoordinatorDashboardInput>,
  ) {}

  execute(input: unknown) {
    return validateInput(this.schema, input, async ({ standId }) => {
      const actor = await this.ports.actors.getActor();
      if (!actor) return err({ code: 'unauthenticated' });
      if (actor.kind !== 'coordinator') return err({ code: 'forbidden' });
      const membership = standId
        ? actor.memberships.find((member) => member.standId === standId)
        : actor.memberships[0];
      if (!membership) return err({ code: 'forbidden' });
      const now = this.ports.clock.now().epochMilliseconds;
      const dayStart =
        Math.floor((now + INDIA_OFFSET_MILLISECONDS) / DAY_MILLISECONDS) * DAY_MILLISECONDS -
        INDIA_OFFSET_MILLISECONDS;
      const snapshot = await this.ports.reader.read({
        subject: actor.subject,
        membership,
        dayStart,
        dayEnd: dayStart + DAY_MILLISECONDS,
      });
      return snapshot.ok
        ? ok({
            dashboard: mapDashboard(snapshot.value),
            standIds: actor.memberships.map((member) => member.standId),
          })
        : snapshot;
    });
  }
}

function mapDashboard({
  stand,
  inviteScope,
  drivers,
  bookings,
  changes,
}: DashboardSnapshot): CoordinatorDashboardView {
  const positions = rankQueue(drivers);
  return {
    stand,
    drivers: drivers.map(({ inviteFacts, ...driver }) => ({
      ...driver,
      hasDevice: inviteFacts.hasDevice,
      canInvite: canIssueInvite({ ...inviteScope, ...inviteFacts }).ok,
      position: positions.get(driver.driverId) ?? null,
    })),
    history: replayQueue(drivers, changes),
    liveBookings: bookings.filter(({ status }) => liveStatuses.has(status)),
    rides: bookings.filter(({ status }) => !liveStatuses.has(status)),
  };
}
