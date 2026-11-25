// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FareQuote } from '@ui/rider/fare-quote';
import { messages } from '@interface/i18n/messages';
import { expectAccessible, renderScreen } from './rider-accessibility.fixtures';

afterEach(cleanup);

test('discloses the fixed fare and who set it before confirmation', async () => {
  const copy = messages.en.rider;
  const onConfirm = vi.fn();
  const { container } = renderScreen(
    <FareQuote
      copy={copy}
      fare="₹60"
      route="River Square → Lantern Garden"
      onConfirm={onConfirm}
      onEdit={vi.fn()}
      isBusy={false}
      wasRefreshed={false}
    />,
    copy.book,
  );
  expect(screen.getByText('₹60')).toBeTruthy();
  expect(screen.getByText("Fare set by the stand's drivers")).toBeTruthy();
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: copy.confirm }));
  expect(onConfirm).toHaveBeenCalledOnce();
  await expectAccessible(container);
});

test('displays and requires explicit confirmation of a refreshed quote', () => {
  const copy = messages.mr.rider;
  const onConfirm = vi.fn();
  renderScreen(
    <FareQuote
      copy={copy}
      fare="₹75"
      route="नदी चौक → कंदील बाग"
      onConfirm={onConfirm}
      onEdit={vi.fn()}
      isBusy={false}
      wasRefreshed
    />,
    copy.book,
  );
  expect(screen.getByRole('status').textContent).toBe(copy.updatedFare);
  expect(screen.getByText('₹75')).toBeTruthy();
  expect(onConfirm).not.toHaveBeenCalled();
});
