import type { DriverNotifier, DriverWakeUp } from '@application/ports/driver-notifier';

export class InMemoryDriverNotifier implements DriverNotifier {
  readonly #wakeUps = new Map<DriverWakeUp['eventId'], DriverWakeUp>();

  wakeUp(notification: DriverWakeUp): Promise<boolean> {
    this.#wakeUps.set(notification.eventId, Object.freeze({ ...notification }));
    return Promise.resolve(true);
  }

  list(): readonly DriverWakeUp[] {
    return [...this.#wakeUps.values()];
  }
}
