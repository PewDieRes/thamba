import type { SessionActor } from '@application/ports/actor-context';

export type ProtectedArea = 'rider' | 'driver' | 'coordinator';

export function canAccessArea(area: ProtectedArea, actor: SessionActor | undefined): boolean {
  if (area === 'coordinator') return actor?.kind === 'coordinator' && actor.memberships.length > 0;
  return actor?.kind === 'anonymous' && (area === 'rider' || actor.hasDriverDevice);
}
