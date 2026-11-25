// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { RiderStatusView } from '@application/contracts/rider-status-view';
import { TOWN } from '../../application/demo-data.fixtures';
import { messages } from '@interface/i18n/messages';
import { mapRiderStatus } from '@interface/routes/rider-status.mapper';
import { BookingStatus } from '@ui/rider/booking-status';
import { BookingNotices } from '@ui/rider/booking-notices';
import { expectAccessible, renderScreen } from './rider-accessibility.fixtures';

afterEach(cleanup);

const copy = messages.en.rider;
const states: ReadonlyArray<[RiderStatusView['status'], string]> = [
  ['scheduled', 'Ride scheduled'],
  ['requested', 'Searching for a driver'],
  ['offering', 'Ride offer sent'],
  ['accepted', 'Driver accepted'],
  ['driver_arrived', 'Driver has arrived'],
  ['in_trip', 'Trip in progress'],
  ['completed', 'Trip completed'],
  ['cancelled_by_rider', 'Booking cancelled by Rider'],
  ['cancelled_by_driver', 'Booking cancelled by Driver'],
  ['no_driver_found', 'No driver found'],
];

function showStatus(status: RiderStatusView) {
  return renderScreen(
    <>
      <BookingStatus copy={copy} details={mapRiderStatus(status, 'en', copy)} />
      <BookingNotices copy={copy} grievance="Demo grievance desk" />
    </>,
    copy.statusTitle,
  );
}

test.each(states)('renders accessible %s status', async (status, heading) => {
  const { container } = showStatus({
    status,
    standName: 'River Square Stand',
    coordinatorContact: 'River Square desk 1234567',
    matchedDriver: { firstName: 'Asha', vehicleNumber: 'DEMO 01', phone: '+919000000000' },
  });
  expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
  if (status === 'requested') expect(screen.getByText('River Square Stand')).toBeTruthy();
  if (status === 'no_driver_found') {
    expect(screen.getByText(/River Square desk 1234567/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /River Square desk/ })).toBeNull();
  }
  if (status === 'accepted') {
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.getByText(/DEMO 01/)).toBeTruthy();
    expect(screen.getByRole('link', { name: copy.call }).getAttribute('href')).toBe(
      'tel:+919000000000',
    );
    expect(screen.getByRole('link', { name: copy.whatsapp }).getAttribute('href')).toBe(
      'https://wa.me/919000000000',
    );
  }
  if (status === 'completed') expect(screen.queryByRole('link', { name: copy.call })).toBeNull();
  expect(screen.queryByText(/9000000000/)).toBeNull();
  await expectAccessible(container);
});

test.each([
  ['No driver found', { noDriverFoundReason: 'stands_exhausted' }],
  [
    'Booking unavailable: licence expired',
    {
      noDriverFoundReason: 'booking_unavailable',
      capability: { kind: 'information_only', reason: 'licence_expired' },
    },
  ],
] as const)('maps and displays the Coordinator phone for %s', async (heading, outcome) => {
  const coordinatorContact = '+919876543210';
  const status = { status: 'no_driver_found', coordinatorContact, ...outcome } as const;
  const callHref = `tel:${coordinatorContact}`;

  expect(mapRiderStatus(status, 'en', copy).coordinator).toEqual({
    text: coordinatorContact,
    callHref,
  });
  const { container } = showStatus(status);
  expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
  expect(screen.getByRole('link', { name: coordinatorContact }).getAttribute('href')).toBe(
    callHref,
  );
  await expectAccessible(container);
});

test('explains when the Demo Run has ended', async () => {
  const { container } = showStatus({
    status: 'no_driver_found',
    noDriverFoundReason: 'booking_unavailable',
    capability: { kind: 'simulated', townId: TOWN, simulationProfile: { kind: 'synthetic' } },
  });
  expect(screen.getByRole('heading', { name: copy.demoRunUnavailable })).toBeTruthy();
  await expectAccessible(container);
});
