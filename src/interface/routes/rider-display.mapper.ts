import type {
  Locale,
  TownOverviewView,
  Translations,
} from '@application/contracts/town-overview-view';
import type { RiderCopy } from '../ui/rider/rider-copy';

const PAISE_PER_RUPEE = 100;
const LOCAL_TIME_ZONE = 'Asia/Kolkata';
const PHONE_SEPARATORS = /[\s().-]/gu;
const DIALABLE_NUMBER = /^\+?[0-9]{3,15}$/u;

export function localizeText(locale: Locale, name: string, names?: Translations) {
  return names?.[locale] ?? name;
}

export function localizeConfiguredContact(
  locale: Locale,
  fallback?: string,
  translations?: Translations,
) {
  return (translations?.[locale] ?? fallback) || undefined;
}

export function mapCoordinatorContact(contact: string | undefined, unavailable: string) {
  const number = contact?.replace(PHONE_SEPARATORS, '');
  return {
    text: contact ?? unavailable,
    callHref: number && DIALABLE_NUMBER.test(number) ? `tel:${number}` : undefined,
  };
}

export function formatFare(locale: Locale, fareInPaise: number) {
  return new Intl.NumberFormat(locale, {
    numberingSystem: 'latn',
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(fareInPaise / PAISE_PER_RUPEE);
}

export function formatPickup(locale: Locale, pickupAtEpochMilliseconds: number) {
  return new Intl.DateTimeFormat(locale, {
    numberingSystem: 'latn',
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: LOCAL_TIME_ZONE,
  }).format(pickupAtEpochMilliseconds);
}

export function getAvailabilityCopy(copy: RiderCopy, capability?: TownOverviewView['capability']) {
  if (capability?.kind !== 'information_only') return copy.bookingUnavailable;
  switch (capability.reason) {
    case 'licence_not_yet_valid':
      return copy.licenceFuture;
    case 'licence_expired':
      return copy.licenceExpired;
    default:
      return copy.licencePending;
  }
}

export function mapTownNotices(town: TownOverviewView, locale: Locale) {
  return {
    capability: town.capability,
    grievance: localizeConfiguredContact(locale, town.grievanceContact, town.grievanceContacts),
    isIllustrative:
      town.hasIllustrativeFares || town.landmarks.some((landmark) => landmark.isIllustrative),
  };
}
