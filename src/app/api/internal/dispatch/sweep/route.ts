import {
  createDispatchSweepContainer,
  logSweepCounts,
  verifySweepAuthorization,
} from '@infrastructure/composition/container';
import { createDispatchSweepRoute } from '@interface/routes/dispatch-sweep';

export const maxDuration = 10;

export function POST(request: Request) {
  return createDispatchSweepRoute({
    isAuthorized: (header) => verifySweepAuthorization(header, process.env.DISPATCH_SWEEP_SECRET),
    sweepDispatch: {
      execute: (input) => {
        const app = createDispatchSweepContainer();
        return app.sweepDispatch.execute(input);
      },
    },
    logCounts: logSweepCounts,
  })(request);
}
