const { defineConfig, devices } = require('@playwright/test');
const { join } = require('node:path');
const { loadEnvFile } = require('node:process');

try {
  loadEnvFile(join(__dirname, '.env.local'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const PORT = 3000;
const origin = `http://127.0.0.1:${PORT}`;
const MOBILE_VIEWPORT_WIDTH_PX = 360;
const MOBILE_VIEWPORT_HEIGHT_PX = 800;

module.exports = defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'mobile-chrome',
      testIgnore: '**/*-desktop.spec.ts',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: MOBILE_VIEWPORT_WIDTH_PX, height: MOBILE_VIEWPORT_HEIGHT_PX },
        screen: { width: MOBILE_VIEWPORT_WIDTH_PX, height: MOBILE_VIEWPORT_HEIGHT_PX },
        locale: 'mr-IN',
      },
    },
    {
      name: 'desktop-chrome',
      testMatch: '**/*-desktop.spec.ts',
      use: { ...devices['Desktop Chrome'], locale: 'en-IN' },
    },
  ],
  use: { baseURL: origin, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${PORT}`,
    url: origin,
    env: { APP_ORIGIN: origin },
  },
});
