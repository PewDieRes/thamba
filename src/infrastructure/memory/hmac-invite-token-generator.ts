import { createHmac, randomBytes } from 'node:crypto';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';

const INVITE_SECRET_BYTES = 32;

export class HmacInviteTokenGenerator implements InviteTokenGenerator {
  readonly #secret = randomBytes(INVITE_SECRET_BYTES);

  derive(seed: string): string {
    return createHmac('sha256', this.#secret).update(seed).digest('base64url');
  }
}
