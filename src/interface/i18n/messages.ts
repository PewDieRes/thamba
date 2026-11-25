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
}

export const messages = {
  en: { common: enCommon, coordinator: enCoordinator, driver: enDriver },
  hi: { common: hiCommon, coordinator: hiCoordinator, driver: hiDriver },
  mr: { common: mrCommon, coordinator: mrCoordinator, driver: mrDriver },
} satisfies Record<(typeof routing.locales)[number], Messages>;
