import type {
  DemoRunProvisioning,
  ScriptedDemoDriver,
} from '@application/ports/demo-run-provisioner';
import type { LandmarkId } from '@domain/shared/ids.value-object';
import { toStandRow } from './stand.mapper';

export function toDemoStandRow(stand: DemoRunProvisioning['stand']) {
  const row = toStandRow(stand);
  return {
    name: stand.name ?? 'Stand',
    name_translations: stand.names ?? {},
    coordinator_contact: row.coordinator_contact,
    coordinator_contact_translations: stand.coordinatorContacts ?? {},
    pickup_cues: row.pickup_cues.map((cue) => ({
      ...cue,
      pickup_cue_translations: stand.pickupCueTranslations?.[cue.landmark_id as LandmarkId] ?? {},
    })),
  };
}

export function toDemoDriverRow({ entry, demoDriver, simulationSteps }: ScriptedDemoDriver) {
  return {
    id: entry.driverId,
    name: demoDriver.name,
    name_translations: demoDriver.names,
    vehicle_number: demoDriver.vehicleNumber,
    queued_at_epoch_microseconds: entry.queuedAt.toString(),
    scripted_steps: Object.entries(simulationSteps).map(([action, delay_seconds]) => ({
      action,
      delay_seconds,
    })),
  };
}
