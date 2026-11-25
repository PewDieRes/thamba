import type {
  Locale,
  TownOverviewView,
  Translations,
} from '@application/contracts/town-overview-view';
import type { RiderCopy } from '../ui/rider/rider-copy';

const PAISE_PER_RUPEE = 100;
const LOCAL_TIME_ZONE = 'Asia/Kolkata';
const PHONE_TEXT = /(?:\p{Nd}[\s()\-./]*){7,}/u;

export function localizeText(locale: Locale, name: string, names?: Translations) {
  return names?.[locale] ?? name;
}

export function localizeContact(locale: Locale, fallback?: string, translations?: Translations) {
  const contact = translations?.[locale] ?? fallback;
  return contact && !PHONE_TEXT.test(contact) ? contact : undefined;
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
    grievance: localizeContact(locale, town.grievanceContact, town.grievanceContacts),
    isIllustrative:
      town.hasIllustrativeFares || town.landmarks.some((landmark) => landmark.isIllustrative),
  };
}
