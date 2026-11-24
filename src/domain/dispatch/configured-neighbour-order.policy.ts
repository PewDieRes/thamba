import { err, ok } from '../shared/result';
import type { StandFallbackInput, StandFallbackPolicy } from './stand-fallback.policy';

export class ConfiguredNeighbourOrderPolicy implements StandFallbackPolicy {
  capture(input: StandFallbackInput): ReturnType<StandFallbackPolicy['capture']> {
    return captureConfiguredNeighbourOrder(input);
  }
}

export function captureConfiguredNeighbourOrder(
  input: StandFallbackInput,
): ReturnType<StandFallbackPolicy['capture']> {
  const { originalStandId, neighbourStandIds, maxSearchStands } = input;
  if (
    maxSearchStands !== undefined &&
    (!Number.isSafeInteger(maxSearchStands) || maxSearchStands < 1)
  ) {
    return err({ code: 'invalid_stand_search_cap' });
  }

  const ordered = [...new Set([originalStandId, ...neighbourStandIds])];
  return ok(Object.freeze(ordered.slice(0, maxSearchStands)));
}
