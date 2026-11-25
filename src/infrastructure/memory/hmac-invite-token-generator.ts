import { createHmac } from 'node:crypto';
import type { InviteTokenGenerator } from '@application/ports/invite-token-generator';

export class HmacInviteTokenGenerator implements InviteTokenGenerator {
  readonly #secret: Uint8Array;

  constructor(secret: Uint8Array) {
    this.#secret = secret;
  }

  derive(seed: string): string {
    return createHmac('sha256', this.#secret).update(seed).digest('base64url');
  }
}
