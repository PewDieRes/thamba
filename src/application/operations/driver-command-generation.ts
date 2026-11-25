import type { Transaction } from '../ports/unit-of-work';
import { createSessionSubject } from '@domain/shared/ids.value-object';

export async function getDriverCommandGeneration(tx: Transaction, actor: string, name: string) {
  if (name === 'redeem_driver_invite' || !actor.startsWith('session:')) return undefined;
  const subject = createSessionSubject(actor.split(':')[1]);
  if (!subject.ok) return undefined;
  const device = await tx.devices.get(subject.value);
  if (device?.value.status !== 'active') return undefined;
  return { driverId: device.value.driverId, bindingVersion: device.version };
}
