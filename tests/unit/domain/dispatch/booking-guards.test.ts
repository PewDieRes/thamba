import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { leaveDriverQueue } from '@domain/dispatch/driver-queue-entry';
import { revokeDevice } from '@domain/identity/driver-device';
import { err } from '@domain/shared/result';
import * as f from './booking.fixtures';

it('checks allocation authority, dispatch deadline, Stand scope and offer expiry', () => {
  const booking = f.makeRequested();
  expect(booking.issueOffer({ ...f.issue, ...f.cannotBook }, f.at(1))).toEqual(
    err({ code: 'booking_unavailable' }),
  );
  expect(booking.issueOffer(f.issue, f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS))).toEqual(
    err({ code: 'dispatch_deadline' }),
  );
  expect(
    booking.issueOffer({ ...f.issue, offer: { ...f.offer, standId: f.otherStandId } }, f.at(1)),
  ).toEqual(err({ code: 'stand_outside_search' }));
  for (const expiresAt of [f.at(1), f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS + 1)]) {
    expect(booking.issueOffer({ ...f.issue, offer: { ...f.offer, expiresAt } }, f.at(1))).toEqual(
      err({ code: 'invalid_offer_expiry' }),
    );
  }
});

it.each([
  [{ offerId: f.otherOfferId }, 2, 'offer_mismatch'],
  [{ driver: f.otherDriverSession }, 2, 'driver_mismatch'],
  [{ entry: leaveDriverQueue(f.reservedEntry) }, 2, 'driver_not_reserved'],
  [{ entry: { ...f.reservedEntry, driverId: f.otherDriverId } }, 2, 'driver_not_reserved'],
  [{ entry: { ...f.reservedEntry, standId: f.otherStandId } }, 2, 'driver_not_reserved'],
  [{ entry: { ...f.reservedEntry, reservation: f.otherOfferId } }, 2, 'driver_not_reserved'],
  [f.cannotBook, 2, 'booking_unavailable'],
  [{}, f.MINUTE_IN_MILLISECONDS, 'offer_expired'],
  [{}, f.DEFAULT_DISPATCH_IN_MILLISECONDS, 'offer_expired'],
] as const)('checks acceptance prerequisites %o at %i ms', (patch, timeInMilliseconds, code) => {
  expect(f.makeOffering().acceptOffer({ ...f.accept, ...patch }, f.at(timeInMilliseconds))).toEqual(
    err({ code }),
  );
});

it('requires a matching session subject and active binding for acceptance', () => {
  const now = f.at(2);
  const booking = f.makeOffering();
  const device = f.unwrap(revokeDevice(f.driverSession.device, now));
  expect(booking.acceptOffer({ ...f.accept, driver: { ...f.driverSession, device } }, now)).toEqual(
    err({ code: 'DEVICE_REVOKED' }),
  );
  const driver = { ...f.driverSession, subject: f.otherSubject };
  expect(booking.acceptOffer({ ...f.accept, driver }, now)).toEqual(
    err({ code: 'session_subject_mismatch' }),
  );
});

it('checks a closing offer against the current offer, actor, authority and deadlines', () => {
  const booking = f.makeOffering();
  const now = f.at(2);
  expect(booking.closeOffer({ ...f.decline, offerId: f.otherOfferId }, now)).toEqual(
    err({ code: 'offer_mismatch' }),
  );
  expect(
    booking.closeOffer(
      { ...f.decline, actor: { ...f.driverActor, driverId: f.otherDriverId } },
      now,
    ),
  ).toEqual(err({ code: 'driver_mismatch' }));
  expect(
    booking.closeOffer(
      { ...f.withdraw, actor: { ...f.coordinatorActor, standId: f.otherStandId } },
      now,
    ),
  ).toEqual(err({ code: 'stand_mismatch' }));
  expect(booking.closeOffer(f.expire, now)).toEqual(err({ code: 'offer_not_due' }));
  expect(booking.closeOffer({ ...f.decline, ...f.cannotBook }, now)).toEqual(
    err({ code: 'booking_unavailable' }),
  );
  expect(booking.closeOffer(f.expire, f.at(f.DEFAULT_DISPATCH_IN_MILLISECONDS))).toEqual(
    err({ code: 'dispatch_deadline' }),
  );
});

it('checks Rider and assigned Driver ownership', () => {
  const now = f.at(5);
  expect(f.makeRequested().cancelByRider(f.otherRiderId, now)).toEqual(
    err({ code: 'rider_mismatch' }),
  );
  expect(f.makeAccepted().reportArrival(f.otherDriverSession, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
  expect(f.makeArrived().confirmPickup(f.otherDriverSession, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
  expect(f.makeInTrip().completeTrip(f.otherDriverSession, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
  expect(f.makeAccepted().cancelByDriver(f.otherDriverSession, now)).toEqual(
    err({ code: 'driver_mismatch' }),
  );
});

it('keeps dispatch open while the Town can book and the search can continue', () => {
  const noExhaustion = { ...f.canBook, areStandsExhausted: false };
  expect(f.makeRequested().endSearch(noExhaustion, f.at(5))).toEqual(
    err({ code: 'dispatch_still_open' }),
  );
  expect(f.makeOffering().endOffering(f.canBook, f.at(5))).toEqual(
    err({ code: 'dispatch_still_open' }),
  );
});

it('keeps event scope and the actual actor when availability closes dispatch', () => {
  const scope = { townId: f.townId, demoRunId: f.demoRunId };
  const booking = f.unwrap(
    Booking.request({ ...f.request, scope, quote: { ...f.quote, scope } }, f.at(0)),
  ).booking;
  const offering = f.unwrap(booking.issueOffer(f.issue, f.at(1))).booking;
  const actor = { ...f.coordinatorActor, fare: f.quote.fare };
  const { events } = f.unwrap(offering.endOffering({ ...f.cannotBook, actor }, f.at(2)));
  expect(events[0]?.actor).toEqual(f.coordinatorActor);
  expect(events[0]).toMatchObject({
    ...scope,
    actor: f.coordinatorActor,
    reason: 'booking_unavailable',
  });
  expect(events[1]).toMatchObject({
    ...scope,
    actor: f.coordinatorActor,
    reason: 'booking_unavailable',
  });
});

it('records only pending Ride offer fields when the selected Driver input has extra details', () => {
  const offer = { ...f.offer, fare: f.quote.fare, riderId: f.riderId };
  const { booking, events } = f.unwrap(
    f.makeRequested().issueOffer({ ...f.canBook, offer }, f.at(1)),
  );
  expect(booking.state.offer).toEqual(f.offer);
  expect(events[0]).not.toHaveProperty('fare');
  expect(events[0]).not.toHaveProperty('riderId');
  expect(events[0]).not.toHaveProperty('route');
});

it('rejects a response from a different Driver when ending dispatch', () => {
  const actor = { type: 'driver', driverId: f.otherDriverId } as const;
  expect(f.makeOffering().endOffering({ ...f.cannotBook, actor }, f.at(2))).toEqual(
    err({ code: 'driver_mismatch' }),
  );
});
