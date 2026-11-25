import type { ApplicationResult } from './application-result';

export interface CoordinatorDirectory {
  isActiveCoordinator(email: string): Promise<ApplicationResult<boolean>>;
}
