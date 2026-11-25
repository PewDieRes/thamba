import { randomUUID } from 'node:crypto';
import { runLocalSql } from './contract-database.fixtures';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const ROLES = ['reader', 'writer', 'sweep'] as const;
const names = new Map<(typeof ROLES)[number], string>();

export function prepareScopedConnections() {
  const base = new URL(process.env.DB_URL ?? DEFAULT_LOCAL_DB_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
    throw new Error('Use a local database URL for integration tests');
  }
  for (const role of ROLES) {
    const name = `thamba_test_${role}_${randomUUID().replaceAll('-', '')}`;
    const password = randomUUID();
    runLocalSql(`create role ${name} login inherit nobypassrls password '${password}';
      grant thamba_${role} to ${name} with inherit true;`);
    names.set(role, name);
    const url = new URL(base);
    url.username = name;
    url.password = password;
    process.env[`DATABASE_${role.toUpperCase()}_URL`] = url.href;
  }
}

export function dropScopedConnections() {
  for (const name of names.values()) runLocalSql(`drop role if exists ${name};`);
  names.clear();
}

export function getScopedConfiguration() {
  const writerUrl = process.env.DATABASE_WRITER_URL;
  const sweepUrl = process.env.DATABASE_SWEEP_URL;
  if (!writerUrl || !sweepUrl)
    throw new Error('Scoped local database connections were not configured');
  return {
    writerUrl,
    sweepUrl,
    backend: 'postgres',
    inviteTokenSecret: Buffer.alloc(32, 1).toString('base64'),
  } as const;
}
