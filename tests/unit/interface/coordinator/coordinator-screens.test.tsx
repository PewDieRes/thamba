// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CoordinatorDashboard } from '@ui/coordinator/coordinator-dashboard';
import { CoordinatorLoginForm } from '@ui/coordinator/coordinator-login-form';
import { messages } from '@interface/i18n/messages';
import { mapRidesCsv } from '@interface/routes/coordinator-rides.mapper';
import type {
  CoordinatorDriver,
  QueueReason,
} from '@application/contracts/coordinator-dashboard-view';
import type { EventId } from '@domain/shared/ids.value-object';
import { DRIVER_ONE, STAND, NOW_MS, uuid } from '../../application/demo-data.fixtures';
import { BOOKING_ID } from '../../../contract/contract-data.fixtures';
import { expectAccessible, renderScreen } from '../rider/rider-accessibility.fixtures';

const router = { refresh: () => undefined };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const { dashboard: copy, login } = messages.en.coordinator;
const driver: CoordinatorDriver = {
  driverId: DRIVER_ONE,
  queuedAt: '5',
  name: 'Asha',
  names: {},
  vehicleNumber: 'DEMO 01',
  availability: 'online',
  tripsToday: 2,
  hasDevice: true,
  canInvite: false,
};
const reasons: readonly QueueReason[] = [
  'skip',
  'expired',
  'declined',
  'cancelled',
  'break',
  'walk_up',
];
const ride = {
  bookingId: BOOKING_ID,
  status: 'completed',
  fareInPaise: 6000,
  pickupAt: NOW_MS,
} as const;

afterEach(cleanup);

test('renders queue reasons, position movements, and bookings by status in an accessible dashboard', async () => {
  const { container } = renderScreen(
    <CoordinatorDashboard
      standIds={[STAND]}
      copy={copy}
      locale="en"
      dashboard={{
        stand: { id: STAND, name: 'River Square Stand', names: {} },
        drivers: [{ ...driver, position: 2 }],
        history: reasons.map((reason, index) => ({
          id: uuid(184 + index) as EventId,
          driverId: DRIVER_ONE,
          reason,
          before: '1',
          occurredAt: NOW_MS,
          movements: [{ driverId: DRIVER_ONE, from: 1, to: 2 }],
        })),
        liveBookings: [{ ...ride, status: 'requested' }],
        rides: [ride],
      }}
    />,
  );
  const history = within(screen.getByRole('region', { name: copy.history }));
  for (const reason of reasons)
    expect(history.getByText(copy.reasons[reason], { exact: false })).toBeDefined();
  expect(history.getAllByText('Asha · 1 → 2')).toHaveLength(reasons.length);
  expect(screen.getByRole('table', { name: copy.statuses.requested })).toBeDefined();
  expect(screen.getByRole('table', { name: copy.rides })).toBeDefined();
  await expectAccessible(container);
});

test('Coordinator sign-in is accessible', async () => {
  const { container } = renderScreen(
    <CoordinatorLoginForm locale="en" copy={login} action={() => Promise.resolve('sent')} />,
    login.title,
  );
  await expectAccessible(container);
});

test('CSV uses only allowlisted booking fields', () => {
  expect(mapRidesCsv([{ ...ride, ...{ riderPhone: 'private' } }])).toBe(
    `booking_id,status,pickup_at,fare_in_paise\r\n${BOOKING_ID},completed,${new Date(NOW_MS).toISOString()},6000\r\n`,
  );
});
