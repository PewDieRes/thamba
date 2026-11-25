import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

export function createAuthClient(cookies: CookieMethodsServer) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey } = process.env;
  if (!url || !anonKey) throw new Error('Missing Supabase Auth configuration');
  return createServerClient<Database>(url, anonKey, {
    cookies,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  });
}

export function createProvisioningClient({
  url,
  serviceRoleKey,
}: {
  url: string;
  serviceRoleKey: string;
}) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function getDatabaseUrl(role: 'reader' | 'writer') {
  const url = process.env[role === 'reader' ? 'DATABASE_READER_URL' : 'DATABASE_WRITER_URL'];
  if (!url) throw new Error('Missing scoped Postgres connection');
  return url;
}
