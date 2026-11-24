import type { ApplicationResult } from '@application/ports/application-result';
import type { Transaction, UnitOfWork } from '@application/ports/unit-of-work';
import { createInMemoryContainer } from '@infrastructure/composition/container';
import { createDemo } from './demo.fixtures';

export const UNAVAILABLE = { ok: false, error: { code: 'storage_unavailable' } } as const;
export const CONFLICT = { ok: false, error: { code: 'ConcurrencyConflict' } } as const;
export type WritePort = keyof Transaction;

class FaultUnitOfWork implements UnitOfWork {
  private readonly base = createInMemoryContainer().unitOfWork;
  changePorts: (tx: Transaction) => Transaction = (tx) => tx;
  beforeCommit: () => ApplicationResult<never> | undefined = () => undefined;

  run<T>(work: (transaction: Transaction) => Promise<ApplicationResult<T>>) {
    return this.base.run(async (tx) => {
      const result = await work(this.changePorts(tx));
      return this.beforeCommit() ?? result;
    });
  }
}

export async function createFaultDemo(options: Parameters<typeof createDemo>[0] = {}) {
  const faults = new FaultUnitOfWork();
  return { app: await createDemo({ ...options, unitOfWork: faults }), faults };
}

export function replaceMethod<T extends object>(
  adapter: T,
  method: keyof T,
  replacement: () => unknown,
): T {
  return new Proxy(adapter, {
    get(target, name) {
      if (name === method) return replacement;
      const value: unknown = Reflect.get(target, name);
      return typeof value === 'function'
        ? (...args: unknown[]) => Reflect.apply(value, target, args) as unknown
        : value;
    },
  });
}

function failWrite(tx: Transaction, port: WritePort): Transaction {
  if (port === 'events')
    return {
      ...tx,
      events: replaceMethod(tx.events, 'append', () => Promise.resolve(UNAVAILABLE)),
    };
  return { ...tx, [port]: replaceMethod(tx[port], 'save', () => Promise.resolve(UNAVAILABLE)) };
}

export async function expectWriteRollbacks(
  { app, faults }: Awaited<ReturnType<typeof createFaultDemo>>,
  run: () => Promise<ApplicationResult<unknown>>,
  ports: readonly WritePort[],
) {
  const events = await app.events();
  for (const port of ports) {
    faults.changePorts = (tx) => failWrite(tx, port);
    const result = await run();
    faults.changePorts = (tx) => tx;
    if (result.ok || result.error.code !== UNAVAILABLE.error.code)
      throw new Error(`Expected ${port} write failure`);
    const actual = await app.events();
    if (actual.length !== events.length)
      throw new Error(`Uncommitted events after ${port} write failure`);
  }
}
