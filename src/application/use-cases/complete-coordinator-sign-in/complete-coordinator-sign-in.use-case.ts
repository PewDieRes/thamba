import { validateInput, type InputSchema } from '@application/contracts/input-schema';
import type { AuthSession } from '@application/ports/auth-session';
import { err } from '@domain/shared/result';
import type { CompleteCoordinatorSignInInput } from './complete-coordinator-sign-in.input';

export class CompleteCoordinatorSignIn {
  constructor(
    private readonly session: Pick<AuthSession, 'exchangeCoordinatorCode' | 'getActor' | 'clear'>,
    private readonly schema: InputSchema<CompleteCoordinatorSignInInput>,
  ) {}

  execute(input: unknown) {
    return validateInput(this.schema, input, async ({ code }) => {
      const result = await this.session.exchangeCoordinatorCode(code);
      if (!result.ok) return result;
      const actor = await this.session.getActor();
      if (actor?.kind === 'coordinator' && actor.memberships.length > 0) return result;
      await this.session.clear();
      return err({ code: 'forbidden' });
    });
  }
}
