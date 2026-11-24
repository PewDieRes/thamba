import type { InputSchema } from '@application/contracts/input-schema';
import { validateInput } from '@application/contracts/input-schema';
import { mapFareChart } from '@application/operations/booking.mapper';
import type { Clock } from '@application/ports/clock';
import type { UnitOfWork } from '@application/ports/unit-of-work';
import { err, ok } from '@domain/shared/result';
import { evaluateBookingCapability } from '@domain/town/town';
import type { GetTownOverviewInput } from './get-town-overview.input';

export class GetTownOverview {
  constructor(
    private readonly ports: { unitOfWork: UnitOfWork; clock: Clock },
    private readonly schema: InputSchema<GetTownOverviewInput>,
  ) {}

  execute(input: unknown) {
    const { unitOfWork, clock } = this.ports;
    return validateInput(this.schema, input, ({ slug }) =>
      unitOfWork.run(async (tx) => {
        const record = (await tx.towns.findBySlug(slug))?.value;
        if (!record) return err({ code: 'not_found' });
        const { town, name, grievanceContact } = record;
        const chart = (await tx.fareCharts.get(town.townId))?.value;
        return ok({
          townId: town.townId,
          name,
          slug,
          grievanceContact,
          capability: evaluateBookingCapability(town, clock.now()),
          fares: mapFareChart(chart),
        });
      }),
    );
  }
}
