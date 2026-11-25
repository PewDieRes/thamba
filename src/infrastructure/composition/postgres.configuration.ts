import postgres, { type Sql } from 'postgres';

const POOL_SIZE = 2;
const IDLE_TIMEOUT_SECONDS = 10;
const CONNECT_TIMEOUT_SECONDS = 3;
const pools = new Map<string, Sql>();

export function getPostgresConnection(url: string): Sql {
  const existing = pools.get(url);
  if (existing) return existing;
  const isLocal = ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);
  const pool = postgres(url, {
    ssl: isLocal ? false : 'verify-full',
    prepare: false,
    max: POOL_SIZE,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
  });
  pools.set(url, pool);
  return pool;
}
