import type { CommandScope } from '../supabase/command-scope';

export interface SupabaseConfiguration {
  readonly backend: 'supabase';
  readonly url: string;
  readonly serviceRoleKey: string;
  readonly commandScope?: CommandScope;
}

export type StorageConfiguration =
  | { readonly backend: 'memory' }
  | {
      readonly backend: 'postgres';
      readonly writerUrl?: string;
      readonly sweepUrl?: string;
      readonly inviteTokenSecret: string | undefined;
    }
  | (SupabaseConfiguration & { readonly inviteTokenSecret: string | undefined });

export function readStorageConfiguration(
  entry: 'request' | 'sweep' = 'request',
): StorageConfiguration {
  if (process.env.NODE_ENV === 'test') return { backend: 'memory' };
  const { DATABASE_WRITER_URL, DATABASE_SWEEP_URL, INVITE_TOKEN_SECRET } = process.env;
  if (entry === 'sweep' && !DATABASE_SWEEP_URL)
    throw new Error('Missing Postgres sweep configuration');
  return {
    backend: 'postgres',
    ...(DATABASE_WRITER_URL ? { writerUrl: DATABASE_WRITER_URL } : {}),
    ...(DATABASE_SWEEP_URL ? { sweepUrl: DATABASE_SWEEP_URL } : {}),
    inviteTokenSecret: INVITE_TOKEN_SECRET,
  };
}
