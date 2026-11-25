import { z } from 'zod';

export const queueActions = ['rejoin', 'offline', 'break', 'walk_up', 'skip'] as const;
export type CoordinatorAction = 'invite' | 'revoke' | (typeof queueActions)[number];

const invite = z.object({ url: z.url({ protocol: /^https?$/ }) });

export async function postCoordinator(
  action: CoordinatorAction,
  driver: { standId: string; driverId: string; locale: string },
) {
  const { locale, ...target } = driver;
  const base = { ...target, commandKey: crypto.randomUUID() };
  const route =
    action === 'revoke' ? 'revoke-device' : action === 'invite' ? 'invite' : 'availability';
  const body =
    action === 'invite'
      ? { ...base, locale }
      : action === 'revoke'
        ? base
        : {
            ...base,
            isOnline: action === 'rejoin',
            ...(action === 'rejoin' ? {} : { reason: action }),
          };
  try {
    const response = await fetch(`/api/coordinator/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { ok: false } as const;
    if (action !== 'invite') return { ok: true } as const;
    const result = invite.safeParse(await response.json());
    return result.success
      ? ({ ok: true, url: result.data.url } as const)
      : ({ ok: false } as const);
  } catch {
    return { ok: false } as const;
  }
}
