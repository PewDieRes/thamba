// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { messages } from '@interface/i18n/messages';
import { DemoStart } from '@ui/rider/demo-start';
import { DemoComplaint } from '@ui/rider/demo-complaint';
import { expectAccessible, renderScreen } from './rider-accessibility.fixtures';

const copy = messages.en.rider.demoFlow;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('public Demo launch offers both scenarios and a public Town link', async () => {
  const { container } = renderScreen(
    <DemoStart
      copy={copy}
      townId="town"
      standId="stand"
      bookingHref="/en/rider/demo-town"
      townHref="/en/towns/demo-town"
    />,
    'Demo Town',
  );
  const scenario = screen.getByRole('combobox', { name: copy.scenario });
  expect(scenario.querySelectorAll('option')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: copy.share }));
  expect((await screen.findByRole<HTMLInputElement>('textbox', { name: copy.link })).value).toBe(
    new URL('/en/towns/demo-town', window.location.origin).href,
  );
  await expectAccessible(container);
});

test('the accessible complaint form submits a sample topic scoped to the run', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(null, { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  const { container } = renderScreen(
    <DemoComplaint copy={copy} townId="town" demoRunId="run" />,
    'Demo Town',
  );
  fireEvent.change(screen.getByRole('combobox', { name: copy.topic }), {
    target: { value: 'wait' },
  });
  fireEvent.click(screen.getByRole('button', { name: copy.send }));
  await screen.findByText(copy.saved);
  expect(fetch.mock.calls[0]?.[0]).toBe('/api/rider/demo-complaint');
  expect(fetch.mock.calls[0]?.[1]?.body).toMatch(/"demoRunId":"run".*"topic":"wait"/);
  await expectAccessible(container);
});
