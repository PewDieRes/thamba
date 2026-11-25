import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import driverMessages from '../../messages/mr/driver.json';
import { expectAccessible } from './rider-accessibility.fixtures';
import {
  bookRiderTrip,
  DEMO_RIDER_NAME,
  DEMO_RIDER_PHONE,
  getLocalDriverFixtureUrl,
  provisionDriverInvite,
  seedRiderContact,
  startRiderDemo,
} from './driver-journey.fixtures';

const { home: copy, invite } = driverMessages;
const MINIMUM_OFFER_TARGET_PIXELS = 64;
const databaseUrl = getLocalDriverFixtureUrl();

test('Driver redeems a Demo invite and completes a Rider booking', async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.skip(info.project.name !== 'mobile-chrome', 'The Driver journey uses the mobile project.');
  test.skip(!databaseUrl, 'The Driver journey uses a local Supabase fixture database.');
  test.setTimeout(90_000);
  if (!databaseUrl || !baseURL) throw new Error('Missing local Driver test configuration');

  const database = postgres(databaseUrl, { max: 1 });
  const rider = await browser.newContext({ baseURL });
  try {
    const run = await startRiderDemo(rider.request, baseURL);
    const token = await provisionDriverInvite(database, run);
    await joinDriverStand(page, token);

    const { bookingId } = await bookRiderTrip(rider.request, baseURL, run);
    await seedRiderContact(database, run, bookingId);
    const riderPage = await rider.newPage();
    await riderPage.goto(`/mr/rider/status/${bookingId}`);

    await acceptPendingOffer(page);
    await completeTrip(page);
    await expect(riderPage.getByRole('heading', { name: 'प्रवास पूर्ण झाला' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: copy.rejoin })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: copy.rejoin }).click();
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('1', { exact: true })).toBeVisible();
  } finally {
    await rider.close();
    await database.end();
  }
});

async function joinDriverStand(page: Page, token: string) {
  await page.goto(`/mr/driver/invite#${token}`);
  await expectAccessible(page);
  await page.getByRole('button', { name: invite.confirm }).click();
  await page.getByRole('link', { name: copy.openHome }).click();
  await expect(page).toHaveURL(/\/mr\/driver$/);
  const availability = page.getByRole('switch', { name: copy.availability });
  await expect(availability).toHaveAttribute('aria-checked', 'false');
  await expectAccessible(page);
  await availability.click();
  await expect(availability).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('1', { exact: true })).toBeVisible();
}

async function acceptPendingOffer(page: Page) {
  const panel = page.getByRole('region', { name: copy.offer });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(copy.pickup)).toBeVisible();
  await expect(panel.getByText(copy.cue)).toBeVisible();
  await expect(panel.getByRole('timer')).toBeVisible();
  for (const label of [copy.destination, copy.fare, copy.rider]) {
    await expect(panel.getByText(label, { exact: true })).toHaveCount(0);
  }
  for (const label of [copy.accept, copy.decline]) {
    const bounds = await panel.getByRole('button', { name: label }).boundingBox();
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_OFFER_TARGET_PIXELS);
    expect(bounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_OFFER_TARGET_PIXELS);
  }
  await expectAccessible(page);
  await panel.getByRole('button', { name: copy.accept }).click();
}

async function completeTrip(page: Page) {
  await expect(page.getByRole('heading', { name: copy.accepted })).toBeVisible();
  await expect(page.getByText(copy.destination)).toBeVisible();
  await expect(page.getByText(copy.fare)).toBeVisible();
  await expect(page.getByText(DEMO_RIDER_NAME)).toBeVisible();
  await expect(page.getByRole('link', { name: copy.call })).toHaveAttribute(
    'href',
    `tel:${DEMO_RIDER_PHONE}`,
  );
  await expectAccessible(page);
  await page.getByRole('button', { name: copy.arrive }).click();
  await expect(page.getByRole('heading', { name: copy.driver_arrived })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: copy.start }).click();
  await expect(page.getByRole('heading', { name: copy.in_trip })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: copy.complete }).click();
  await expect(page.getByRole('button', { name: copy.rejoin })).toBeVisible();
  await expect(page.getByRole('link', { name: copy.call })).toHaveCount(0);
}
