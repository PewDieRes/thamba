import { validateInput, type InputSchema } from '@application/contracts/input-schema';
import type { AuthSession } from '@application/ports/auth-session';
import type { StartAnonymousSessionInput } from './start-anonymous-session.input';

export class StartAnonymousSession {
  constructor(
    private readonly session: Pick<AuthSession, 'ensureAnonymous'>,
    private readonly schema: InputSchema<StartAnonymousSessionInput>,
  ) {}

  execute(input: unknown) {
    return validateInput(this.schema, input, () => this.session.ensureAnonymous());
  }
}
