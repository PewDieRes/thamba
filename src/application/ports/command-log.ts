import type { ApplicationResult, WriteResult } from './application-result';
import type { ExpectedVersion, Versioned } from './versioned';

export interface CommandIdentity {
  readonly actor: string;
  readonly key: string;
}

export interface CommandRecord extends CommandIdentity {
  readonly inputHash: string;
  readonly result: ApplicationResult<unknown>;
}

export interface CommandLog {
  get(identity: CommandIdentity): Promise<Versioned<CommandRecord> | undefined>;
  save(record: CommandRecord, expectedVersion: ExpectedVersion): Promise<WriteResult>;
}
