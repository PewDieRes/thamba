// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { CoordinatorDriver } from '@application/contracts/coordinator-dashboard-view';
import { DriverActions } from '@ui/coordinator/driver-actions';
import { messages } from '@interface/i18n/messages';
import { queueActions } from '@interface/routes/coordinator-command';
import { DRIVER_ONE, STAND } from '../../application/demo-data.fixtures';
import { expectAccessible, renderScreen } from '../rider/rider-accessibility.fixtures';

const { dashboard: copy } = messages.en.coordinator;
const inviteUrl = 'https://example.test/en/driver/invite#synthetic';
const driver: CoordinatorDriver = {
  driverId: DRIVER_ONE,
  queuedAt: '1',
  name: 'Asha',
  names: {},
  vehicleNumber: 'DEMO 01',
  availability: 'online',
  tripsToday: 0,
  hasDevice: true,
  canInvite: true,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test.each(['invite', 'revoke', ...queueActions] as const)(
  '%s shows pending, error and success states',
  async (action) => {
    let finish: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetch = vi
      .fn()
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(Response.json(action === 'invite' ? { url: inviteUrl } : null));
    const onChange = vi.fn();
    vi.stubGlobal('fetch', fetch);
    renderScreen(
      <DriverActions
        driver={{ ...driver, availability: action === 'rejoin' ? 'offline' : 'online' }}
        standId={STAND}
        locale="en"
        copy={copy}
        onChange={onChange}
      />,
      copy.drivers,
    );
    const button = screen.getByRole<HTMLButtonElement>('button', { name: copy.actions[action] });
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe(copy.saving);
    finish?.(new Response(null, { status: 409 }));
    expect((await screen.findByRole('alert')).textContent).toBe(copy.error[action]);
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect((await screen.findByText(copy.success[action])).getAttribute('role')).toBe('status');
    expect(onChange).toHaveBeenCalledTimes(1);
    if (action === 'invite') await assertInvite();
  },
);

async function assertInvite() {
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: copy.inviteLink }).value).toBe(
    inviteUrl,
  );
  expect(screen.getByRole('link', { name: copy.whatsapp }).getAttribute('href')).toContain(
    encodeURIComponent(inviteUrl),
  );
  await expectAccessible(document.body);
}
