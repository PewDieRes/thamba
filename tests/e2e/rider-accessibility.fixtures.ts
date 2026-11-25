import { expect, type Page } from '@playwright/test';
import axe from 'axe-core';

export async function expectAccessible(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const browser = window as Window & { axe?: typeof axe };
    if (!browser.axe) throw new Error('axe did not load');
    const { violations } = await browser.axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }));
  });
  expect(violations).toEqual([]);
}
