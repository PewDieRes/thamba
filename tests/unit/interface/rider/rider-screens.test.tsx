// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { createTownId } from '@domain/shared/ids.value-object';
import { unwrap } from '../../domain/dispatch/booking.fixtures';
import { messages } from '@interface/i18n/messages';
import { BookingNotices } from '@ui/rider/booking-notices';
import { RideForm } from '@ui/rider/ride-form';
import { TownOverview } from '@ui/rider/town-overview';
import { expectAccessible, renderScreen } from './rider-accessibility.fixtures';

afterEach(cleanup);

const copy = messages.en.rider;

test('information-only Town is accessible and has no booking control', async () => {
  const { container } = renderScreen(
    <TownOverview
      copy={copy}
      name="Malvan"
      unavailable={copy.licencePending}
      notices={{ isIllustrative: true, grievance: 'Thamba project desk' }}
      stands={[{ id: 'stand', name: 'Market Stand', contact: 'Thamba project desk' }]}
      fares={[{ id: 'fare', route: 'Market → Jetty', day: '₹50', night: '₹65' }]}
    />,
  );
  expect(screen.getByText(copy.licencePending)).toBeTruthy();
  expect(screen.getByRole('table', { name: copy.fares })).toBeTruthy();
  expect(screen.queryByRole('link', { name: copy.book })).toBeNull();
  await expectAccessible(container);
});

test.each(['now', 'later'] as const)('booking form is accessible with %s pickup', async (when) => {
  const { container } = renderScreen(
    <>
      <RideForm
        copy={copy}
        passengerOptions={[1, 2, 3]}
        values={{ from: '', to: '', passengers: 1, when, date: '' }}
        queries={{ from: '', to: '' }}
        options={{ from: [], to: [] }}
        onChange={vi.fn()}
        onSearch={vi.fn()}
        onSubmit={vi.fn()}
        isBusy={false}
        error={undefined}
      />
      <BookingNotices copy={copy} grievance="Demo grievance desk" />
    </>,
    copy.book,
  );
  await expectAccessible(container);
});

test('bookable Town is accessible with its ULIN and booking link', async () => {
  const { container } = renderScreen(
    <TownOverview
      copy={copy}
      name="Licensed Town"
      bookingHref="/en/rider/licensed-town"
      notices={{
        capability: {
          kind: 'live',
          ulin: 'ULIN-123',
          townId: unwrap(createTownId('00000000-0000-0000-0000-000000000001')),
        },
        grievance: 'Town desk',
      }}
      stands={[]}
      fares={[]}
    />,
  );
  expect(screen.getByText('ULIN-123')).toBeTruthy();
  expect(screen.getByRole('link', { name: copy.book })).toBeTruthy();
  await expectAccessible(container);
});
