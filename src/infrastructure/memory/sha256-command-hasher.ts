import { createHash } from 'node:crypto';
import type { CommandHasher } from '@application/ports/command-hasher';

export class Sha256CommandHasher implements CommandHasher {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
