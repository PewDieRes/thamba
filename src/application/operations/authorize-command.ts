import type { ActorContext } from '../ports/actor-context';

export async function canExecuteCommand(
  context: ActorContext,
  { actor, name }: { readonly actor: string; readonly name: string },
): Promise<boolean> {
  const session = await context.getActor();
  if (session?.kind === 'coordinator') {
    return session.memberships.some(
      ({ coordinatorId }) => `coordinator:${coordinatorId}` === actor,
    );
  }
  if (session?.kind === 'sweep') return actor === 'dispatch';
  if (session?.kind !== 'anonymous') return false;
  if (actor === `rider:${session.subject}`) return true;
  return (
    actor === `session:${session.subject}` &&
    (session.hasDriverDevice || name === 'redeem_driver_invite')
  );
}
