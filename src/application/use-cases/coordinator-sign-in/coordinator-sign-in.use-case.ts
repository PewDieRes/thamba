import { validateInput, type InputSchema } from '@application/contracts/input-schema';
import type { AuthSession } from '@application/ports/auth-session';
import type { CoordinatorDirectory } from '@application/ports/coordinator-directory';
import { ok } from '@domain/shared/result';
import type { CoordinatorSignInInput } from './coordinator-sign-in.input';

export class CoordinatorSignIn {
  constructor(
    private readonly ports: {
      session: Pick<AuthSession, 'sendCoordinatorLink'>;
      directory: CoordinatorDirectory;
    },
    private readonly schema: InputSchema<CoordinatorSignInInput>,
  ) {}

  execute(input: unknown) {
    return validateInput(this.schema, input, async ({ email, callback }) => {
      const canonicalEmail = email.trim().toLowerCase();
      const allowed = await this.ports.directory.isActiveCoordinator(canonicalEmail);
      if (!allowed.ok) return allowed;
      if (!allowed.value) return ok(undefined);
      return this.ports.session.sendCoordinatorLink(canonicalEmail, callback);
    });
  }
}
