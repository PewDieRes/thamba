import fc from 'fast-check';
import { expect, it } from 'vitest';
import { createBookingId } from '@domain/shared/ids.value-object';
import { uuid } from '../unit/application/demo-data.fixtures';
import { createDemo, requestRide, unwrap } from '../unit/application/demo.fixtures';

const MAX_SIMULTANEOUS_TRIGGERS = 5;
const MAX_REPLAY_RUNS = 25;
const OTHER_BOOKING = unwrap(createBookingId(uuid(77)));

it('I12 returns the same committed dispatch result to interleaved keyed triggers', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.boolean(), { minLength: 1, maxLength: MAX_SIMULTANEOUS_TRIGGERS }),
      async (keyedCalls) => {
        const app = await createDemo();
        const { bookingId } = await requestRide(app);
        const input = { bookingId, commandKey: 'advance' };
        const results = await Promise.all(
          keyedCalls.map((isKeyed) => app.advanceDispatch.execute(isKeyed ? input : { bookingId })),
        );
        const committed = await app.advanceDispatch.execute(input);
        expect(committed).toEqual({ ok: true, value: { bookingId, status: 'offering' } });
        for (const result of results) {
          if (result.ok) expect(result).toEqual(committed);
          else expect(result.error.code).toBe('ConcurrencyConflict');
        }
        expect(await app.advanceDispatch.execute(input)).toEqual(committed);
        expect(await app.advanceDispatch.execute({ ...input, bookingId: OTHER_BOOKING })).toEqual({
          ok: false,
          error: { code: 'idempotency_key_reused' },
        });
        const created = (await app.events()).filter(
          ({ event }) => event.type === 'RideOfferCreated',
        );
        expect(created).toHaveLength(1);
      },
    ),
    { numRuns: MAX_REPLAY_RUNS },
  );
});
