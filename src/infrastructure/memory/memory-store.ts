import type { Booking } from '@domain/dispatch/booking';
import type { RecordedRideOffer } from '@application/ports/ride-offer-repository';
import type { ScopedQueueEntry } from '@application/ports/driver-queue-repository';
import type { Stand } from '@application/ports/stand-repository';
import type { TownRecord } from '@application/ports/town-repository';
import type { FareChart } from '@domain/fares/fare-chart';
import type { StoredFareQuote } from '@application/ports/fare-quote-repository';
import type { Trip } from '@domain/trip/trip';
import type { ScopedDriverInvite } from '@application/ports/driver-invite-repository';
import type { DriverDevice } from '@domain/identity/driver-device';
import type { CommandRecord } from '@application/ports/command-log';
import type { RecordedEvent } from '@application/ports/event-log';
import { MemoryTable } from './memory-table';

export class MemoryStore {
  constructor(
    readonly tables = {
      bookings: new MemoryTable<Booking>(),
      offers: new MemoryTable<RecordedRideOffer>(),
      drivers: new MemoryTable<ScopedQueueEntry>(),
      stands: new MemoryTable<Stand>(),
      towns: new MemoryTable<TownRecord>(),
      fareCharts: new MemoryTable<FareChart>(),
      quotes: new MemoryTable<StoredFareQuote>(),
      trips: new MemoryTable<Trip>(),
      invites: new MemoryTable<ScopedDriverInvite>(),
      devices: new MemoryTable<DriverDevice>(),
      commands: new MemoryTable<CommandRecord>(),
      events: new MemoryTable<RecordedEvent>(),
    },
  ) {}

  fork(): MemoryStore {
    const { tables } = this;
    return new MemoryStore({
      bookings: tables.bookings.fork(),
      offers: tables.offers.fork(),
      drivers: tables.drivers.fork(),
      stands: tables.stands.fork(),
      towns: tables.towns.fork(),
      fareCharts: tables.fareCharts.fork(),
      quotes: tables.quotes.fork(),
      trips: tables.trips.fork(),
      invites: tables.invites.fork(),
      devices: tables.devices.fork(),
      commands: tables.commands.fork(),
      events: tables.events.fork(),
    });
  }

  seal(): void {
    for (const table of Object.values(this.tables)) table.seal();
  }

  get hasChanges(): boolean {
    return Object.values(this.tables).some((table) => table.hasChanges);
  }
}
