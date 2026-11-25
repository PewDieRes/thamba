import type { ActorContext } from './actor-context';
import type { ApplicationResult } from './application-result';

export interface AuthSession extends ActorContext {
  ensureAnonymous(): Promise<ApplicationResult<void>>;
  sendCoordinatorLink(email: string, callback: string): Promise<ApplicationResult<void>>;
  clear(): Promise<void>;
  exchangeCoordinatorCode(code: string): Promise<ApplicationResult<void>>;
}
