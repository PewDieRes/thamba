import type { Clock } from '@application/ports/clock';
import type {
  MatchedRiderContact,
  MatchedRiderContactReader,
} from '@application/ports/matched-rider-contact-reader';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import type { BookingId, SessionSubject, StandId } from '@domain/shared/ids.value-object';
import type { Instant } from '@domain/shared/instant.value-object';
import type { BookingScope } from '@domain/town/town';

interface StoredContact extends BookingScope {
  readonly standId: StandId;
  readonly purgeAfter: Instant;
  readonly contact: MatchedRiderContact;
}

interface CoordinatorMembership extends BookingScope {
  readonly standId: StandId;
  readonly subject: SessionSubject;
}

interface ContactReaderOptions {
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly contacts?: ReadonlyMap<BookingId, StoredContact>;
  readonly activeCoordinators?: readonly CoordinatorMembership[];
}

export class InMemoryMatchedRiderContactReader implements MatchedRiderContactReader {
  constructor(private readonly options: ContactReaderOptions) {}

  async get({
    bookingId,
    subject,
  }: Parameters<MatchedRiderContactReader['get']>[0]): ReturnType<
    MatchedRiderContactReader['get']
  > {
    const { contacts, clock, unitOfWork } = this.options;
    const row = contacts?.get(bookingId);
    if (!row || clock.now().isAtOrAfter(row.purgeAfter)) return { ok: true, value: null };
    return unitOfWork.run<MatchedRiderContact | null>(async ({ trips, devices }) => {
      const trip = (await trips.get(bookingId))?.value;
      if (this.coordinatesContact(subject, row, trip?.standId))
        return { ok: true, value: row.contact };
      if (!trip || 'endedAt' in trip) return { ok: true, value: null };
      const device = (await devices.get(subject))?.value;
      const isMatched = device?.status === 'active' && device.driverId === trip.driverId;
      return { ok: true, value: isMatched ? row.contact : null };
    });
  }

  private coordinatesContact(
    subject: SessionSubject,
    row: StoredContact,
    assignedStandId?: StandId,
  ) {
    return this.options.activeCoordinators?.some(
      (membership) =>
        membership.subject === subject &&
        membership.townId === row.townId &&
        membership.demoRunId === row.demoRunId &&
        (membership.standId === row.standId || membership.standId === assignedStandId),
    );
  }
}
