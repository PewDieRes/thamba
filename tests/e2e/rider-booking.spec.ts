import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from './rider-accessibility.fixtures';

const SLOW_3G_LATENCY_MILLISECONDS = 400;
const SLOW_3G_BYTES_PER_SECOND = 50_000;
const MOBILE_VIEWPORT_WIDTH_PIXELS = 360;

const variables = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'DATABASE_READER_URL',
  'DATABASE_WRITER_URL',
  'INVITE_TOKEN_SECRET',
];

const missingVariables = variables.filter((name) => !process.env[name]);
const supabaseUrl = process.env.SUPABASE_URL;
const isLocal =
  supabaseUrl &&
  URL.canParse(supabaseUrl) &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(supabaseUrl).hostname);

const skipReason =
  missingVariables.length > 0
    ? `Local Supabase environment missing: ${missingVariables.join(', ')}`
    : isLocal
      ? ''
      : 'The Rider journey requires a local Supabase URL.';

if (process.env.CI && skipReason) throw new Error(skipReason);
test.skip(Boolean(skipReason), skipReason);

test('books a Demo Town ride from searching through completion at 360 px', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'mobile-chrome',
    'The Rider journey runs on the 360 px mobile project.',
  );
  test.setTimeout(90_000);
  await emulateSlow3G(page);
  await page.goto('/mr/towns/demo-town?from=river-square');
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/towns\/demo-town\?from=river-square$/);
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Book a rickshaw' }).click();

  await expect(page.getByRole('combobox', { name: 'From', exact: true })).toHaveValue(
    '00000000-0000-0000-0000-000000000021',
  );
  await chooseDestination(page);
  await page.getByRole('button', { name: 'See fare' }).click();

  await expect(page.getByRole('heading', { name: 'Your fixed fare' })).toBeVisible();
  await expect(page.getByText("Fare set by the stand's drivers")).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Grievance contact' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Confirm booking' }).click();

  await expect(page).toHaveURL(/\/en\/rider\/status\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'Searching for a driver' })).toBeVisible();
  await expect(page.getByText('River Square Stand', { exact: true })).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth)).toBeLessThanOrEqual(
    MOBILE_VIEWPORT_WIDTH_PIXELS,
  );
  await expectAccessible(page);
  await verifyTripProgress(page);
});

test('Malvan shows its illustrative fares with no booking controls', async ({ page }) => {
  await page.goto('/en/towns/malvan');
  await expect(page.getByText('Booking unavailable: licence pending')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rickshaw Stands' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Fixed fares' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book a rickshaw' })).toHaveCount(0);
  await expectAccessible(page);
});

async function chooseDestination(page: Page) {
  await page.getByRole('searchbox', { name: 'To · Search landmarks' }).fill('कंदील');
  await page
    .getByRole('combobox', { name: 'To', exact: true })
    .selectOption({ label: 'Lantern Garden' });
  await expectAccessible(page);
}

async function emulateSlow3G(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: SLOW_3G_LATENCY_MILLISECONDS,
    downloadThroughput: SLOW_3G_BYTES_PER_SECOND,
    uploadThroughput: SLOW_3G_BYTES_PER_SECOND,
    connectionType: 'cellular3g',
  });
}

async function verifyTripProgress(page: Page) {
  await expect(page.getByRole('heading', { name: 'Ride offer sent' })).toBeVisible({
    timeout: 9_000,
  });
  await expect(page.getByRole('heading', { name: 'Driver accepted' })).toBeVisible({
    timeout: 9_000,
  });
  await expect(page.getByText('Asha', { exact: true })).toBeVisible();
  await expect(page.getByText(/DEMO 01/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Driver has arrived' })).toBeVisible({
    timeout: 9_000,
  });
  await expect(page.getByRole('heading', { name: 'Trip in progress' })).toBeVisible({
    timeout: 9_000,
  });
  await expect(page.getByRole('heading', { name: 'Trip completed' })).toBeVisible({
    timeout: 12_000,
  });
}
