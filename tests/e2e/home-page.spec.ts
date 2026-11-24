import { expect, test } from '@playwright/test';

test('renders the home page in Marathi by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/mr\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'mr');
  await expect(page.getByRole('heading', { name: 'थांबा' })).toBeVisible();
});
