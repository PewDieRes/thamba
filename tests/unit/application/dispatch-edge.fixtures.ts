import { createStandId } from '@domain/shared/ids.value-object';
import { Instant } from '@domain/shared/instant.value-object';
import { Town } from '@domain/town/town';
import { DEMO_TOWN, HOUR_MS, NOW_MS, TOWN, uuid } from './demo-data.fixtures';
import { quoteInput, requestInput, unwrap, type Demo } from './demo.fixtures';

export const MINUTE_MS = 60_000;
export const LEAD_TIME_MS = 20 * MINUTE_MS;
export const DISPATCH_DEADLINE_MS = 90_000;
export const OTHER_STAND = unwrap(createStandId(uuid(42)));

export function at(app: Demo, elapsedMilliseconds: number) {
  app.clock.set(unwrap(Instant.fromEpochMilliseconds(NOW_MS + elapsedMilliseconds)));
}

export async function write(app: Demo, act: Parameters<Demo['unitOfWork']['run']>[0]) {
  unwrap(await app.unitOfWork.run(act));
}

export async function suspendTown(app: Demo) {
  await write(app, ({ towns }) =>
    towns.save({ ...DEMO_TOWN, town: Town.create({ townId: TOWN }) }, 1),
  );
}

export async function schedule(app: Demo, advanceByMilliseconds = HOUR_MS) {
  const quote = unwrap(
    await app.quoteFare.execute({
      ...quoteInput,
      pickupAtEpochMilliseconds: NOW_MS + advanceByMilliseconds,
    }),
  );
  return unwrap(await app.scheduleRide.execute({ ...requestInput, quoteId: quote.quoteId }));
}
