import type { Transaction } from '@application/ports/unit-of-work';
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
