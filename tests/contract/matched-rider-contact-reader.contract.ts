import type { MatchedRiderContactReader } from '@application/ports/matched-rider-contact-reader';
import { describe, expect, test } from 'vitest';
import {
  NEW_SUBJECT,
  OTHER_SUBJECT,
  SUBJECT_ONE,
  SUBJECT_TWO,
} from '../unit/application/demo-data.fixtures';
import { BOOKING_ID } from './contract-data.fixtures';

export const RIDER_CONTACT = { firstName: 'Demo Rider', phone: '+916000000001' };
export const TOWN_COORDINATOR_SUBJECT = NEW_SUBJECT;
export const OTHER_TOWN_COORDINATOR_SUBJECT = OTHER_SUBJECT;

export interface ContactFixtureState {
  readonly isDeviceRevoked?: boolean;
  readonly hasTripEnded?: boolean;
  readonly isPastPurgeTime?: boolean;
}

const cases = [
  {
    name: 'matched Driver during an active Trip',
    subject: SUBJECT_ONE,
    state: {},
    contact: RIDER_CONTACT,
  },
  { name: 'unrelated Driver', subject: SUBJECT_TWO, state: {}, contact: null },
  {
    name: 'revoked Driver device',
    subject: SUBJECT_ONE,
    state: { isDeviceRevoked: true },
    contact: null,
  },
  {
    name: 'matched Driver after the Trip ends',
    subject: SUBJECT_ONE,
    state: { hasTripEnded: true },
    contact: null,
  },
  {
    name: 'matched Driver after the contact purge time',
    subject: SUBJECT_ONE,
    state: { isPastPurgeTime: true },
    contact: null,
  },
  {
    name: 'Coordinator of the Town',
    subject: TOWN_COORDINATOR_SUBJECT,
    state: {},
    contact: RIDER_CONTACT,
  },
  {
    name: 'Coordinator of another Town',
    subject: OTHER_TOWN_COORDINATOR_SUBJECT,
    state: {},
    contact: null,
  },
];

export function matchedRiderContactReaderContract(
  make: (
    state: ContactFixtureState,
  ) => MatchedRiderContactReader | Promise<MatchedRiderContactReader>,
) {
  describe('MatchedRiderContactReader', () => {
    test.each(cases)(
      'returns the expected contact for $name',
      async ({ subject, state, contact }) => {
        const reader = await make(state);
        expect(await reader.get({ bookingId: BOOKING_ID, subject })).toEqual({
          ok: true,
          value: contact,
        });
      },
    );
  });
}
