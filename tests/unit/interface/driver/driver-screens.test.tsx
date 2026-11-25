// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ConfirmInvite } from '@ui/driver/confirm-invite';
import { DriverDashboard } from '@ui/driver/driver-dashboard';
import { DriverOffer } from '@ui/driver/driver-offer';
import { DriverTrip } from '@ui/driver/driver-trip';
import { messages } from '@interface/i18n/messages';
import { expectAccessible, renderScreen } from '../rider/rider-accessibility.fixtures';
import {
  copy,
  home,
  NOW_MILLISECONDS,
  OFFER_DURATION_MILLISECONDS,
  offer,
  riderPhone,
  trip,
} from './driver.fixtures';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('shows the invite confirmation accessibly', async () => {
  window.history.replaceState(null, '', '/en/driver/invite#test-invite');
  const invite = messages.en.driver.invite;
  const { container } = renderScreen(
    <ConfirmInvite copy={{ ...invite, openHome: copy.openHome }} homeHref="/en/driver" />,
    invite.title,
  );
  expect(screen.getByRole('button', { name: invite.confirm })).toBeTruthy();
  await expectAccessible(container);
});

test.each(['offline', 'online', 'completed'] as const)(
  'shows an accessible %s home',
  async (status) => {
    const onToggle = vi.fn();
    const onRejoin = vi.fn();
    const state =
      status === 'online'
        ? { ...home, availability: 'online' as const, queuePosition: 2 }
        : { ...home, needsRejoin: status === 'completed' };
    const { container } = renderScreen(
      <DriverDashboard
        state={state}
        copy={copy}
        locale="en"
        isBusy={false}
        onToggle={onToggle}
        onRejoin={onRejoin}
      />,
      copy.title,
    );
    if (status === 'completed') {
      fireEvent.click(screen.getByRole('button', { name: copy.rejoin }));
      expect(onRejoin).toHaveBeenCalledOnce();
      expect(screen.queryByRole('switch')).toBeNull();
      expect(screen.getByText(copy.completed)).toBeTruthy();
    } else {
      const availability = screen.getByRole('switch', { name: copy.availability });
      expect(availability.getAttribute('aria-checked')).toBe(String(status === 'online'));
      fireEvent.click(availability);
      expect(onToggle).toHaveBeenCalledOnce();
    }
    if (status === 'online') expect(screen.getByText('2')).toBeTruthy();
    else expect(screen.queryByText(copy.queuePosition)).toBeNull();
    await expectAccessible(container);
  },
);

test('pending offer is pickup-only and both actions are accessible', async () => {
  const onRespond = vi.fn();
  const pending = { ...offer, expiresAtEpochMilliseconds: Date.now() + 60_000 };
  const { container } = renderScreen(
    <DriverOffer offer={pending} copy={copy} locale="en" isBusy={false} onRespond={onRespond} />,
    copy.title,
  );
  expect(screen.getByText('River Square')).toBeTruthy();
  expect(screen.getByText('By the blue sign')).toBeTruthy();
  for (const label of [copy.fare, copy.destination, copy.rider]) {
    expect(screen.queryByText(label)).toBeNull();
  }
  expect(screen.queryByRole('link')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: copy.accept }));
  fireEvent.click(screen.getByRole('button', { name: copy.decline }));
  expect(onRespond.mock.calls).toEqual([['accept'], ['decline']]);
  await expectAccessible(container);
});

test('countdown hides the full offer at the exact deadline between polls', () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MILLISECONDS);
  renderScreen(
    <DriverOffer offer={offer} copy={copy} locale="en" isBusy={false} onRespond={vi.fn()} />,
  );
  expect(screen.getByRole('timer').textContent).toBe('3');
  void act(() => vi.advanceTimersByTime(OFFER_DURATION_MILLISECONDS - 1));
  expect(screen.getByRole('timer').textContent).toBe('1');
  void act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole('region', { name: copy.offer })).toBeNull();
  expect(screen.queryByRole('button', { name: copy.accept })).toBeNull();
});

test.each([
  ['accepted', 'arrive'],
  ['driver_arrived', 'start'],
  ['in_trip', 'complete'],
] as const)('shows an accessible %s Trip with the next action', async (status, action) => {
  const onProgress = vi.fn();
  const { container } = renderScreen(
    <DriverTrip
      trip={{ ...trip, status }}
      copy={copy}
      locale="en"
      isBusy={false}
      onProgress={onProgress}
    />,
    copy.title,
  );
  expect(screen.getByRole('heading', { name: copy[status] })).toBeTruthy();
  expect(screen.getByText('Lantern Garden')).toBeTruthy();
  expect(screen.getByText('₹60')).toBeTruthy();
  expect(screen.getByText('Demo Rider')).toBeTruthy();
  expect(screen.getByRole('link', { name: copy.call }).getAttribute('href')).toBe(
    `tel:${riderPhone}`,
  );
  fireEvent.click(screen.getByRole('button', { name: copy[action] }));
  expect(onProgress).toHaveBeenCalledExactlyOnceWith(action);
  await expectAccessible(container);
});
