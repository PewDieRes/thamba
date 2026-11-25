const { dirname, join } = require('node:path');
const { defineConfig } = require('vitest/config');

const domainFiles = 'src/domain/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';
const applicationFiles = 'src/application/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';
const testFile = '*.{test,spec}.{ts,mts,cts,tsx,js,mjs,cjs,jsx}';

module.exports = defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Vitest runs server composition in Node without Next's react-server export condition.
    alias: { 'server-only': join(dirname(require.resolve('server-only')), 'empty.js') },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [`tests/{unit,property}/**/${testFile}`],
        },
      },
      {
        extends: true,
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.{test,spec}.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
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
      exclude: ['**/*.d.ts'],
      thresholds: {
        [domainFiles]: { lines: 95, branches: 95, functions: 95, statements: 95 },
        [applicationFiles]: { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  },
});
