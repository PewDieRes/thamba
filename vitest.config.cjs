const { defineConfig } = require('vitest/config');

const domainFiles = 'src/domain/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';
const applicationFiles = 'src/application/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';
const testFile = '*.{test,spec}.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';

module.exports = defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            `tests/{unit,property}/**/${testFile}`,
            `src/{domain,application}/**/${testFile}`,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.{contract,test,spec}.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
        },
      },
      {
        extends: true,
        test: { name: 'integration', include: [`tests/integration/**/${testFile}`] },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [domainFiles, applicationFiles],
      exclude: ['**/*.d.ts', `**/${testFile}`],
      thresholds: {
        [domainFiles]: { lines: 95, branches: 95, functions: 95, statements: 95 },
        [applicationFiles]: { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  },
});
