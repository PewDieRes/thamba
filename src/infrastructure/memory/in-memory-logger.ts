import type { Logger } from '@application/ports/logger';

export class InMemoryLogger implements Logger {
  readonly #warnings: Parameters<Logger['warn']>[0][] = [];

  warn(event: Parameters<Logger['warn']>[0]): void {
    this.#warnings.push(event);
  }
}
