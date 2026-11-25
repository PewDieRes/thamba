// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test } from 'vitest';
import { createLandmarkId, createTownId } from '@domain/shared/ids.value-object';
import { messages } from '@interface/i18n/messages';
import { RideBookingFlow } from '@interface/routes/ride-booking-flow';
import { unwrap } from '../../domain/dispatch/booking.fixtures';

const townId = unwrap(createTownId('00000000-0000-0000-0000-000000000001'));
const notices = {
  capability: { kind: 'simulated', townId, simulationProfile: { kind: 'synthetic' } },
  grievance: undefined,
  isIllustrative: false,
} as const;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

test('Riders can select a destination once the server-rendered form hydrates', () => {
  const from = unwrap(createLandmarkId('00000000-0000-0000-0000-000000000021'));
  const to = unwrap(createLandmarkId('00000000-0000-0000-0000-000000000022'));
  const form = (
    <RideBookingFlow
      townName="Demo Town"
      townId={townId}
      copy={messages.en.rider}
      locale="en"
      isDemo
      notices={notices}
      stands={[]}
      passengerOptions={[1, 2, 3]}
      landmarks={[
        { id: from, label: 'River Square', searchable: 'river square' },
        { id: to, label: 'Lantern Garden', searchable: 'lantern garden कंदील' },
      ]}
      preselection={from}
    />
  );
  const container = document.createElement('main');
  container.innerHTML = renderToString(form);
  document.body.append(container);

  const search = screen.getByRole('searchbox', { name: 'To · Search landmarks' });
  const destination = screen.getByRole<HTMLSelectElement>('combobox', { name: 'To' });
  const seeFare = screen.getByRole('button', { name: 'See fare' });
  expect(search.matches(':disabled')).toBe(true);
  expect(destination.matches(':disabled')).toBe(true);
  expect(seeFare.matches(':disabled')).toBe(true);

  render(form, { container, hydrate: true });
  expect(search.matches(':enabled')).toBe(true);
  expect(destination.matches(':enabled')).toBe(true);
  expect(seeFare.matches(':enabled')).toBe(true);
  fireEvent.change(search, { target: { value: 'कंदील' } });
  expect(within(destination).queryByRole('option', { name: 'River Square' })).toBeNull();
  fireEvent.change(destination, { target: { value: to } });
  expect(destination.value).toBe(to);
});
