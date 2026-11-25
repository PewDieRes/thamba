import { z } from 'zod';
import type { ApplicationResult } from '@application/ports/application-result';
import { getAppOrigin } from '../auth/request-origin';

const localeSchema = z.enum(['mr', 'hi', 'en']);
const callbackSchema = z.strictObject({ code: z.string().min(1).max(512), locale: localeSchema });

export function createCoordinatorCallback(completeSignIn: {
  execute(input: unknown): Promise<ApplicationResult<void>>;
}) {
  return async function get(request: Request) {
    const { searchParams } = new URL(request.url);
    const parsed = callbackSchema.safeParse({
      code: searchParams.get('code'),
      locale: searchParams.get('locale'),
    });
    const locale = parsed.success ? parsed.data.locale : 'mr';
    const result = parsed.success && (await completeSignIn.execute({ code: parsed.data.code }));
    const path = result && result.ok ? `/${locale}/coordinator` : `/${locale}/coordinator/login`;
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(path, getAppOrigin(request.url)).href,
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  };
}
