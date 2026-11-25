import type { RepositoryAccess } from './repository-access';
import type { ApplicationResult } from './application-result';
import type { BookingRepository } from './booking-repository';
import type { CommandLog } from './command-log';
import type { DriverDeviceRepository } from './driver-device-repository';
import type { DriverInviteRepository } from './driver-invite-repository';
import type { DriverQueueRepository } from './driver-queue-repository';
import type { EventLog } from './event-log';
import type { FareChartRepository } from './fare-chart-repository';
import type { FareQuoteRepository } from './fare-quote-repository';
import type { RideOfferRepository } from './ride-offer-repository';
import type { StandRepository } from './stand-repository';
import type { TownRepository } from './town-repository';
import type { TripRepository } from './trip-repository';

export interface Transaction {
  readonly bookings: BookingRepository;
  readonly offers: RideOfferRepository;
  readonly drivers: DriverQueueRepository;
  readonly stands: StandRepository;
  readonly towns: TownRepository;
  readonly fareCharts: FareChartRepository;
  readonly quotes: FareQuoteRepository;
  readonly trips: TripRepository;
  readonly invites: DriverInviteRepository;
  readonly devices: DriverDeviceRepository;
  readonly commands: CommandLog;
  readonly events: EventLog;
}

export interface UnitOfWork {
  run<T>(
    work: (transaction: Transaction) => Promise<ApplicationResult<T>>,
    access?: RepositoryAccess,
  ): Promise<ApplicationResult<T>>;
}
