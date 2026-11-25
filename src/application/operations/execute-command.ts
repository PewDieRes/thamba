import type { RepositoryTarget } from '../ports/repository-access';
import { getDriverCommandGeneration } from './driver-command-generation';
import { canExecuteCommand } from './authorize-command';
import type { ActorContext } from '../ports/actor-context';
import { err, ok } from '@domain/shared/result';
import type { ApplicationError, ApplicationResult } from '../ports/application-result';
import type { CommandHasher } from '../ports/command-hasher';
import type { DriverNotifier, DriverWakeUp } from '../ports/driver-notifier';
import type { Logger } from '../ports/logger';
import type { Transaction, UnitOfWork } from '../ports/unit-of-work';

interface Command<T> {
  readonly target: RepositoryTarget;
  readonly actor: string;
  readonly onReplay?: (
    tx: Transaction,
    result: ApplicationResult<T>,
  ) => Promise<ApplicationResult<T>>;
  readonly name: string;
  readonly input: { readonly commandKey?: string | undefined };
}

interface CommandEffects<T> {
  readonly result: ApplicationResult<T>;
  readonly wakeUp?: DriverWakeUp;
}

export type CommandDecision<T> = ApplicationResult<CommandEffects<T>>;

export function commit<T>(value: T, wakeUp?: DriverWakeUp): CommandDecision<T> {
  return ok({ result: ok(value), ...(wakeUp === undefined ? {} : { wakeUp }) });
}

export function rejectAfterCommit(error: ApplicationError): CommandDecision<never> {
  return ok({ result: err(error) });
}

export interface CommandDependencies {
  readonly actorContext: ActorContext;
  readonly unitOfWork: UnitOfWork;
  readonly hasher: CommandHasher;
  readonly notifier: DriverNotifier;
  readonly logger: Logger;
}

export class CommandExecutor {
  constructor(private readonly dependencies: CommandDependencies) {}

  async run<T>(
    { actor, name, input, onReplay, target }: Command<T>,
    decide: (tx: Transaction) => Promise<CommandDecision<T>>,
  ): Promise<ApplicationResult<T>> {
    const { actorContext, hasher, unitOfWork, notifier, logger } = this.dependencies;
    const key = input.commandKey;
    const committed = await unitOfWork.run<CommandEffects<T>>(
      async (tx) => {
        if (!(await canExecuteCommand(actorContext, { actor, name })))
          return err({ code: 'forbidden' });
        if (key === undefined) return decide(tx);

        const generation = await getDriverCommandGeneration(tx, actor, name);
        const inputHash = hasher.hash(
          JSON.stringify(generation ? [name, input, generation] : [name, input]),
        );
        const previous = await tx.commands.get({ actor, key });
        if (previous) {
          if (previous.value.inputHash !== inputHash)
            return err({ code: 'idempotency_key_reused' });
          // The hash binds the record to this command's input and result type.
          const result = previous.value.result as ApplicationResult<T>;
          return ok({ result: onReplay ? await onReplay(tx, result) : result });
        }
        const decision = await decide(tx);
        if (!decision.ok) return decision;
        const saved = await tx.commands.save(
          { actor, key, inputHash, result: decision.value.result },
          null,
        );
        return saved.ok ? decision : saved;
      },
      { target, command: { actor, key } },
    );
    if (!committed.ok) return committed;
    const wakeUp = committed.value.wakeUp;
    if (wakeUp && !(await notifier.wakeUp(wakeUp))) logger.warn('driver_notification_failed');
    return committed.value.result;
  }
}
