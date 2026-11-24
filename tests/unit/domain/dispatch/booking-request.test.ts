import { expect, it } from 'vitest';
import { Booking } from '@domain/dispatch/booking';
import { err } from '@domain/shared/result';
import * as f from './booking.fixtures';

it.each([
  [{ riderId: f.otherRiderId }, 0, 'quote_scope_mismatch'],
  [{ currentFareChartVersion: 2 }, 0, 'stale_quote'],
  [{}, f.MINUTE_IN_MILLISECONDS, 'stale_quote'],
  [f.cannotBook, 0, 'booking_unavailable'],
] as const)('checks the quote and Town at confirmation', (patch, timeInMilliseconds, code) => {
  const now = f.at(timeInMilliseconds);
  expect(Booking.request({ ...f.request, ...patch }, now)).toEqual(err({ code }));
  expect(Booking.schedule({ ...f.schedule, ...patch }, now)).toEqual(err({ code }));
});

it('checks quote Town and demo run independently of Rider ownership', () => {
  const mismatchedScope = { townId: f.otherTownId, demoRunId: f.demoRunId };
  const townMismatch = { ...f.request, scope: mismatchedScope };
  const runMismatch = { ...f.request, scope: { townId: f.townId, demoRunId: f.demoRunId } };
  for (const input of [townMismatch, runMismatch]) {
    expect(Booking.request(input, f.at(0))).toEqual(err({ code: 'quote_scope_mismatch' }));
  }
});

it('checks future pickup, timing overflow and positive dispatch duration', () => {
  const now = f.at(0);
  expect(Booking.schedule({ ...f.schedule, pickupAt: now }, now)).toEqual(
    err({ code: 'pickup_not_in_future' }),
  );
  expect(
    Booking.schedule(
      { ...f.schedule, pickupAt: f.at(-2), leadTime: f.duration(Number.MAX_SAFE_INTEGER) },
      f.at(-3),
    ),
  ).toEqual(err({ code: 'invalid_request_due_at' }));
  const late = f.at(Number.MAX_SAFE_INTEGER - 1);
  const quote = { ...f.quote, expiresAt: f.at(Number.MAX_SAFE_INTEGER) };
  expect(Booking.request({ ...f.request, quote }, late)).toEqual(
    err({ code: 'invalid_dispatch_deadline' }),
  );
  expect(Booking.request({ ...f.request, dispatchDuration: f.duration(0) }, now)).toEqual(
    err({ code: 'invalid_dispatch_deadline' }),
  );
});

it('activates immediately within the lead window and captures dispatch settings at activation', () => {
  const now = f.at(0);
  const pickupAt = f.at(f.MINUTE_IN_MILLISECONDS);
  const scheduled = f.unwrap(Booking.schedule({ ...f.schedule, pickupAt }, now)).booking;
  const activated = f.unwrap(
    scheduled.activate(
      {
        ...f.canBook,
        dispatchDuration: f.duration(500),
        alternateStandIds: [f.otherStandId, f.standId, f.otherStandId],
      },
      now,
    ),
  ).booking;
  expect(scheduled.state.requestDueAt?.epochMilliseconds).toBe(
    f.MINUTE_IN_MILLISECONDS - f.DEFAULT_LEAD_IN_MILLISECONDS,
  );
  expect(activated.state.requestedAt).toBe(now);
  expect(activated.state.dispatchDeadline?.epochMilliseconds).toBe(500);
  expect(activated.state.searchStandIds).toEqual([f.standId, f.otherStandId]);
});

it('checks due time and current Town authority on both scheduled paths', () => {
  const booking = f.makeScheduled();
  const early = f.at(f.dueInMilliseconds - 1);
  const due = f.at(f.dueInMilliseconds);
  expect(booking.activate(f.canBook, early)).toEqual(err({ code: 'schedule_not_due' }));
  expect(booking.closeSchedule(f.cannotBook, early)).toEqual(err({ code: 'schedule_not_due' }));
  expect(booking.activate(f.cannotBook, due)).toEqual(err({ code: 'booking_unavailable' }));
  expect(booking.closeSchedule(f.canBook, due)).toEqual(err({ code: 'dispatch_still_open' }));
  expect(booking.activate({ ...f.canBook, dispatchDuration: f.duration(0) }, due)).toEqual(
    err({ code: 'invalid_dispatch_deadline' }),
  );
});

it('keeps the first activation time after an offer closes and dispatch continues', () => {
  const due = f.at(f.dueInMilliseconds);
  const requested = f.unwrap(f.makeScheduled().activate(f.canBook, due)).booking;
  const offer = { ...f.offer, expiresAt: f.at(f.dueInMilliseconds + f.MINUTE_IN_MILLISECONDS) };
  const offering = f.unwrap(requested.issueOffer({ ...f.canBook, offer }, due)).booking;
  const retryAt = f.at(f.dueInMilliseconds + 1);
  const retry = f.unwrap(offering.closeOffer(f.decline, retryAt)).booking;
  expect(retry.state.status).toBe('requested');
  expect(retry.state.requestedAt).toBe(due);
  expect(retry.activate(f.canBook, retryAt)).toEqual(err({ code: 'illegal_transition' }));
});
