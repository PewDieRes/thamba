import type { SessionSubject, StandCoordinatorId, StandId } from '@domain/shared/ids.value-object';
import type { BookingScope } from '@domain/town/town';

export interface CoordinatorMembership extends BookingScope {
  readonly coordinatorId: StandCoordinatorId;
  readonly standId: StandId;
}

export type SessionActor =
  | {
      readonly kind: 'anonymous';
      readonly subject: SessionSubject;
      readonly hasDriverDevice: boolean;
    }
  | {
      readonly kind: 'coordinator';
      readonly subject: SessionSubject;
      readonly memberships: readonly CoordinatorMembership[];
    }
  | { readonly kind: 'sweep' };

export interface ActorContext {
  getActor(): Promise<SessionActor | undefined>;
}
