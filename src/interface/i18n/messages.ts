import mrRider from '../../../messages/mr/rider.json';
import hiRider from '../../../messages/hi/rider.json';
import enRider from '../../../messages/en/rider.json';
import enCommon from '../../../messages/en/common.json';
import enCoordinator from '../../../messages/en/coordinator.json';
import enDriver from '../../../messages/en/driver.json';
import hiCommon from '../../../messages/hi/common.json';
import hiCoordinator from '../../../messages/hi/coordinator.json';
import hiDriver from '../../../messages/hi/driver.json';
import mrCommon from '../../../messages/mr/common.json';
import mrCoordinator from '../../../messages/mr/coordinator.json';
import mrDriver from '../../../messages/mr/driver.json';
import type { routing } from './routing';

export interface Messages {
  common: typeof mrCommon;
  coordinator: typeof mrCoordinator;
  driver: typeof mrDriver;
  rider: typeof mrRider;
}

export const messages = {
  en: { common: enCommon, coordinator: enCoordinator, driver: enDriver, rider: enRider },
  hi: { common: hiCommon, coordinator: hiCoordinator, driver: hiDriver, rider: hiRider },
  mr: { common: mrCommon, coordinator: mrCoordinator, driver: mrDriver, rider: mrRider },
} satisfies Record<(typeof routing.locales)[number], Messages>;
