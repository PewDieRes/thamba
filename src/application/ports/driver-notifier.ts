import type { DriverId, EventId } from '@domain/shared/ids.value-object';

export interface DriverWakeUp {
  readonly driverId: DriverId;
  readonly eventId: EventId;
}

export interface DriverNotifier {
  wakeUp(notification: DriverWakeUp): Promise<boolean>;
}
