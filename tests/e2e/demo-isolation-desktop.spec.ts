import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from './rider-accessibility.fixtures';
import { getLocalDriverFixtureUrl } from './driver-journey.fixtures';
import copy from '../../messages/en/rider.json';

const DEMO_TOWN = '00000000-0000-0000-0000-000000000001';
const DEMO_TIMEOUT_MILLISECONDS = 75_000;

test('two public Demo Runs keep bookings and complaints isolated', async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(!getLocalDriverFixtureUrl(), 'Requires the local Supabase stack');
  test.setTimeout(DEMO_TIMEOUT_MILLISECONDS);
  if (!baseURL) throw new Error('Missing Playwright base URL');
  const other = await browser.newContext({ baseURL });
  try {
    const second = await other.newPage();
    const [firstRun, secondRun] = await Promise.all([
      start(page, 'successful_trip'),
      start(second, 'queue_exhaustion'),
    ]);
    expect(firstRun).not.toBe(secondRun);
    await expectAccessible(page);
    await page.getByRole('button', { name: copy.demoFlow.send }).click();
    await expect(page.getByRole('status')).toHaveText(copy.demoFlow.saved);
    const crossComplaint = await page.request.post('/api/rider/demo-complaint', {
      headers: { Origin: baseURL },
      data: { townId: DEMO_TOWN, demoRunId: secondRun, complaintId: randomUUID(), topic: 'wait' },
    });
    expect(crossComplaint.status()).toBe(403);
    await Promise.all([book(page), book(second)]);
    const [firstStatus, secondStatus] = [page.url(), second.url()];
    expect(firstStatus).not.toBe(secondStatus);
    await Promise.all([
      expect(page.getByRole('heading', { name: copy.completed })).toBeVisible({ timeout: 40_000 }),
      expect(second.getByRole('heading', { name: copy.no_driver_found })).toBeVisible({
        timeout: 25_000,
      }),
    ]);
    await expectAccessible(second);
    await second.goto(firstStatus);
    await expect(second.getByText(copy.missingStatus)).toBeVisible();
  } finally {
    await other.close();
  }
});

async function start(page: Page, scenario: string) {
  await page.goto('/en');
  await page.getByRole('link', { name: copy.demoFlow.tryDemo }).click();
  await expect(page.getByRole('heading', { name: copy.demoFlow.tryDemo })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: copy.demoFlow.share }).click();
  const href = await page.getByRole('textbox', { name: copy.demoFlow.link }).inputValue();
  expect(new URL(href).search).toBe('');
  expect(new URL(href).pathname).toBe('/en/towns/demo-town');
  await page.getByRole('combobox', { name: copy.demoFlow.scenario }).selectOption(scenario);
  await page.getByRole('button', { name: copy.demoFlow.start }).click();
  await expect(page).toHaveURL(/\/en\/rider\/demo-town\?run=/);
  const run = new URL(page.url()).searchParams.get('run');
  if (!run) throw new Error('Demo booking has no run scope');
  return run;
}

async function book(page: Page) {
  await page
    .getByRole('combobox', { name: copy.from, exact: true })
    .selectOption({ label: 'River Square' });
  await page
    .getByRole('combobox', { name: copy.to, exact: true })
    .selectOption({ label: 'Lantern Garden' });
  await page.getByRole('button', { name: copy.quote }).click();
  await page.getByRole('button', { name: copy.confirm }).click();
  await expect(page).toHaveURL(/\/en\/rider\/status\//);
}
