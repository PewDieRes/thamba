import { render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { expect } from 'vitest';

export function renderScreen(screen: ReactNode, title?: string) {
  document.documentElement.lang = 'en';
  document.title = 'Thamba';
  return render(
    <main>
      {title && <h1>{title}</h1>}
      {screen}
    </main>,
  );
}

export async function expectAccessible(screen: HTMLElement) {
  const result = await axe.run(screen, {
    rules: { 'color-contrast': { enabled: false } },
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  expect(
    result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
  ).toEqual([]);
}
