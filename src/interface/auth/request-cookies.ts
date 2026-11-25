import type { CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getRequestCookies(): Promise<CookieMethodsServer> {
  const jar = await cookies();
  return {
    getAll: () => jar.getAll(),
    setAll: (updates) => {
      for (const { name, value, options } of updates) jar.set(name, value, options);
    },
  };
}
