const { globSync, readFileSync } = require('node:fs');
const ts = require('typescript');

const framework = '^src/(app/|proxy[.]ts$)';
const interfaceLayer = '^src/interface/';
const composition = '^src/infrastructure/composition/';
const applicationContracts = '^src/application/(ports|projections|contracts)/';
const localeMessages = '^messages/(mr|en|hi)/';
const serverComposition = '^src/infrastructure/composition/container[.]ts$';
const browserComposition = '^src/infrastructure/composition/browser[.]ts$';
const browserAdapters = '^src/infrastructure/supabase/browser/';
const frameworkWiring =
  '^src/proxy[.]ts$|^src/app/(?:.*/|)(?:page|layout|route|actions|browser)[.]tsx?$';
const dependencies = '(^|/)node_modules/';

function forbid(name, from, to) {
  return { name, severity: 'error', from, to };
}

function hasClientDirective(path) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) {
      return false;
    }
    if (statement.expression.text === 'use client') return true;
  }
  return false;
}

const clientEntries = globSync('src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}', {
  exclude: ['**/*.d.ts'],
}).filter(hasClientDirective);
const browserEntries = [
  browserComposition,
  ...clientEntries.map((path) => `^${RegExp.escape(path)}$`),
];

module.exports = {
  forbidden: [
    forbid('no-unresolved', {}, { couldNotResolve: true }),
    forbid('no-cycles', {}, { circular: true }),
    forbid('domain-stays-pure', { path: '^src/domain/' }, { pathNot: '^src/domain/' }),
    forbid(
      'application-stays-in-core',
      { path: '^src/application/' },
      {
        pathNot: '^src/(application|domain)/',
      },
    ),
    forbid(
      'use-cases-depend-on-ports',
      { path: '^src/application/use-cases/([^/]+)/' },
      {
        path: '^src/application/use-cases/([^/]+)/',
        pathNot: '^src/application/use-cases/$1/',
      },
    ),
    forbid(
      'adapters-use-ports-and-domain',
      { path: '^src/infrastructure/', pathNot: composition },
      {
        pathNot: [
          '^src/infrastructure/(?!composition/)',
          '^src/application/ports/',
          '^src/domain/',
          dependencies,
          '^node:',
        ],
        dependencyTypesNot: ['core'],
      },
    ),
    forbid(
      'adapters-use-domain-types',
      { path: '^src/infrastructure/', pathNot: composition },
      {
        path: '^src/domain/',
        dependencyTypesNot: ['type-only'],
      },
    ),
    forbid(
      'composition-stays-in-wiring',
      { path: composition },
      {
        pathNot: ['^src/(infrastructure|domain|application|interface)/', dependencies, '^node:'],
        dependencyTypesNot: ['core'],
      },
    ),
    forbid(
      'interface-uses-contracts',
      { path: interfaceLayer },
      {
        pathNot: [interfaceLayer, applicationContracts, localeMessages, dependencies],
      },
    ),
    forbid(
      'framework-uses-interface',
      { path: framework },
      {
        pathNot: [
          framework,
          interfaceLayer,
          applicationContracts,
          localeMessages,
          serverComposition,
          browserComposition,
          dependencies,
        ],
      },
    ),
    forbid(
      'framework-composition-entry-points',
      { path: framework, pathNot: frameworkWiring },
      {
        path: composition,
      },
    ),
    forbid(
      'browser-adapters-cannot-use-node',
      { path: [browserComposition, browserAdapters] },
      { dependencyTypes: ['core'] },
    ),
    forbid(
      'browser-cannot-reach-server-infrastructure',
      { path: browserEntries },
      {
        path: '^src/infrastructure/',
        pathNot: [browserComposition, browserAdapters],
        reachable: true,
      },
    ),
    forbid(
      'browser-cannot-reach-server-only-marker',
      { path: browserEntries },
      {
        path: '(^|/)node_modules/server-only(?:/|$)',
        reachable: true,
      },
    ),
  ],
  options: {
    doNotFollow: { path: dependencies },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
