import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { expectAccessible } from './rider-accessibility.fixtures';
import { getLocalDriverFixtureUrl, startRiderDemo } from './driver-journey.fixtures';
import { provisionCoordinator, readMagicLink } from './coordinator-desktop.fixtures';
import { dashboard, login } from '../../messages/en/coordinator.json';
import { home, invite } from '../../messages/en/driver.json';

const databaseUrl = getLocalDriverFixtureUrl();
const apiUrl = process.env.SUPABASE_URL;
const hasLocalFixtures = Boolean(databaseUrl && apiUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);

test('Coordinator signs in, invites a Driver and records a break', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  test.skip(!hasLocalFixtures, 'Requires local Supabase and Mailpit');
  if (!databaseUrl || !apiUrl || !baseURL)
    throw new Error('Missing local Playwright configuration');
  const db = postgres(databaseUrl, { max: 1 });
  const driver = await browser.newContext({ baseURL });
  try {
    const run = await startRiderDemo(request, baseURL);
    const coordinator = await provisionCoordinator(db, run);
    try {
      await signIn(page, { apiUrl, email: coordinator.email });
      const url = await issueInvite(page);
      const driverPage = await driver.newPage();
      await redeemInvite(driverPage, url);
      await page.getByRole('button', { name: dashboard.actions.break }).click();
      await expect(page.getByRole('status')).toHaveText(dashboard.success.break);
      const history = page.getByRole('region', { name: dashboard.history });
      await expect(history.getByText(dashboard.reasons.break, { exact: false })).toBeVisible();
      await expect(history.getByText('Asha (demo) · 1 → Out of queue')).toBeVisible();
      await expectAccessible(page);
      await expect(driverPage.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      await page.getByRole('button', { name: dashboard.actions.rejoin }).click();
      await expect(page.getByRole('status')).toHaveText(dashboard.success.rejoin);
      await expect(history.getByText('Asha (demo) · Out of queue → 1')).toBeVisible();
    } finally {
      await coordinator.cleanup();
    }
  } finally {
    await driver.close();
    await db.end();
  }
});

async function signIn(page: Page, { apiUrl, email }: { apiUrl: string; email: string }) {
  await page.goto('/en/coordinator');
  await expect(page).toHaveURL(/\/en\/coordinator\/login$/);
  await expectAccessible(page);
  await page.getByRole('textbox', { name: login.email }).fill(email);
  await page.getByRole('button', { name: login.submit }).click();
  await expect(page.getByRole('status')).toHaveText(login.sent);
  await page.goto(await readMagicLink(apiUrl, email));
  await expect(page).toHaveURL(/\/en\/coordinator$/);
  await expect(page.getByRole('heading', { name: dashboard.title })).toBeVisible();
}

async function issueInvite(page: Page) {
  await page.getByRole('button', { name: dashboard.actions.invite }).click();
  const link = page.getByRole('textbox', { name: dashboard.inviteLink });
  await expect(link).toBeVisible();
  const url = await link.inputValue();
  await expect(page.getByRole('link', { name: dashboard.whatsapp })).toHaveAttribute(
    'href',
    `https://wa.me/?text=${encodeURIComponent(url)}`,
  );
  await expectAccessible(page);
  return url;
}

async function redeemInvite(page: Page, url: string) {
  await page.goto(url);
  await expectAccessible(page);
  await page.getByRole('button', { name: invite.confirm }).click();
  await expect(page.getByRole('status')).toHaveText(invite.confirmed);
  await page.getByRole('link', { name: home.openHome }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
}
