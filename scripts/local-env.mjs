import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const SCOPED_ROLES = ['reader', 'writer', 'sweep'];
const SECRET_BYTES = 32;
const DEFAULT_POSTGRES_PORT = '5432';
const CONNECT_TIMEOUT_SECONDS = 5;
const ENV_FILE = new URL('../.env.local', import.meta.url);

function readSupabaseStatus() {
  try {
    return parseEnv(
      execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
        cwd: new URL('../', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  } catch {
    console.error('Could not read local Supabase status. Start it with pnpm exec supabase start.');
    return null;
  }
}

function parseLocalUrl(value, protocols) {
  const url = URL.parse(value ?? '');
  if (!url || !LOCAL_HOSTS.includes(url.hostname) || !protocols.includes(url.protocol)) {
    return null;
  }
  return url;
}

function createScopedLogins(dbUrl) {
  return SCOPED_ROLES.map((role) => {
    const name = `thamba_local_${role}`;
    const password = randomBytes(SECRET_BYTES).toString('hex');
    const url = new URL(dbUrl);
    url.username = name;
    url.password = password;
    return { role, name, password, url };
  });
}

async function provisionScopedLogins(dbUrl, logins) {
  const sql = postgres(dbUrl.href, {
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    debug: false,
    onnotice: () => {},
  });
  try {
    await sql.begin(async (tx) => {
      for (const { role, name, password } of logins) {
        const [existing] = await tx`select 1 from pg_roles where rolname = ${name}`;
        if (!existing) await tx`create role ${tx(name)}`;
        // Postgres role DDL requires a literal; the generated password is hexadecimal.
        await tx`alter role ${tx(name)} login inherit nocreatedb nocreaterole nobypassrls
          password ${tx.unsafe(`'${password}'`)}`;
        await tx`grant ${tx(`thamba_${role}`)} to ${tx(name)} with inherit true`;
      }
    });
  } finally {
    await sql.end();
  }
}

async function writeLocalEnvironment(dbUrl, logins, variables) {
  const tempFile = new URL(`../.env.local.${randomUUID()}`, import.meta.url);
  const contents = Object.entries(variables)
    .map(([name, value]) => `${name}=${value}\n`)
    .join('');

  try {
    await writeFile(tempFile, contents, { flag: 'wx', mode: 0o600 });
    await provisionScopedLogins(dbUrl, logins);
    await rename(tempFile, ENV_FILE);
  } finally {
    await rm(tempFile, { force: true });
  }
}

async function setupLocalEnvironment() {
  const status = readSupabaseStatus();
  if (!status) return false;

  const supabaseUrl = parseLocalUrl(status.SUPABASE_URL ?? status.API_URL, ['http:', 'https:']);
  const dbUrl = parseLocalUrl(status.DB_URL, ['postgres:', 'postgresql:']);
  // A query parameter can redirect the Postgres client away from the validated host.
  if (!supabaseUrl || !dbUrl || dbUrl.search || dbUrl.hash) {
    console.error('Local setup requires localhost or 127.0.0.1 and a direct Postgres DB_URL.');
    return false;
  }
  if (!status.ANON_KEY) {
    console.error('Local Supabase status is missing ANON_KEY.');
    return false;
  }

  dbUrl.port ||= DEFAULT_POSTGRES_PORT;
  const logins = createScopedLogins(dbUrl);
  const databaseUrls = Object.fromEntries(
    logins.map(({ role, url }) => [`DATABASE_${role.toUpperCase()}_URL`, url.href]),
  );
  await writeLocalEnvironment(dbUrl, logins, {
    SUPABASE_URL: supabaseUrl.origin,
    SUPABASE_ANON_KEY: status.ANON_KEY,
    ...databaseUrls,
    INVITE_TOKEN_SECRET: randomBytes(SECRET_BYTES).toString('base64'),
    DISPATCH_SWEEP_SECRET: randomBytes(SECRET_BYTES).toString('hex'),
    APP_ORIGIN: 'http://127.0.0.1:3000',
  });
  console.log('Wrote .env.local for local Thamba development.');
  return true;
}

try {
  if (!(await setupLocalEnvironment())) process.exitCode = 1;
} catch {
  console.error(
    'Local setup failed. Check that Supabase migrations are applied and .env.local is writable.',
  );
  process.exitCode = 1;
}
