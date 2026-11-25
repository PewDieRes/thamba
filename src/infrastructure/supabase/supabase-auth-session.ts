import { isAuthSessionMissingError } from '@supabase/supabase-js';
import type { ApplicationResult } from '@application/ports/application-result';
import type { AuthSession } from '@application/ports/auth-session';
import type { SessionActor } from '@application/ports/actor-context';
import type { SessionSubject } from '@domain/shared/ids.value-object';
import type { SessionMembershipReader } from '@application/ports/session-membership-reader';
import { SAVED, UNAVAILABLE, type Client } from './repository-storage';

const FORBIDDEN = { ok: false, error: { code: 'forbidden' } } as const;

export class SupabaseAuthSession implements AuthSession {
  constructor(
    private readonly client: Client,
    private readonly memberships: SessionMembershipReader,
  ) {}

  async getActor(): Promise<SessionActor | undefined> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (error || !user) return undefined;
    const subject = user.id as SessionSubject;
    if (user.is_anonymous === true) {
      return {
        kind: 'anonymous',
        subject,
        hasDriverDevice: await this.memberships.hasDriverDevice(subject),
      };
    }
    if (user.is_anonymous !== false || !user.email_confirmed_at) return undefined;
    const memberships = await this.memberships.listCoordinatorMemberships(subject);
    return { kind: 'coordinator', subject, memberships };
  }

  async ensureAnonymous(): Promise<ApplicationResult<void>> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (user) return user.is_anonymous === true ? SAVED : FORBIDDEN;
    if (error && !isAuthSessionMissingError(error)) return UNAVAILABLE;
    const { error: signInError } = await this.client.auth.signInAnonymously();
    if (signInError?.status === 429)
      return { ok: false, error: { code: 'rate_limit_exceeded' } } as const;
    return signInError ? UNAVAILABLE : SAVED;
  }

  async sendCoordinatorLink(email: string, callback: string): Promise<ApplicationResult<void>> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: callback },
    });
    if (error?.status === 429) return { ok: false, error: { code: 'rate_limit_exceeded' } };
    return error ? UNAVAILABLE : SAVED;
  }

  async exchangeCoordinatorCode(code: string): Promise<ApplicationResult<void>> {
    const { error } = await this.client.auth.exchangeCodeForSession(code);
    return error ? FORBIDDEN : SAVED;
  }

  async clear() {
    await this.client.auth.signOut({ scope: 'local' });
  }
}
