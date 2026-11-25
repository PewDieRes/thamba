import type { MatchedDriverView, RiderStatusView } from '@application/contracts/rider-status-view';
import type { Locale } from '@application/contracts/town-overview-view';
import type { StatusDetails } from '../ui/rider/booking-status';
import type { RiderCopy } from '../ui/rider/rider-copy';
import {
  formatPickup,
  getAvailabilityCopy,
  localizeConfiguredContact,
  localizeText,
  mapCoordinatorContact,
} from './rider-display.mapper';

const INDIAN_PHONE = /^\+91[6-9]\d{9}$/u;

export function mapRiderStatus(
  status: RiderStatusView,
  locale: Locale,
  copy: RiderCopy,
): StatusDetails {
  const { status: state, matchedDriver, pickupAtEpochMilliseconds, standName } = status;
  return {
    heading: statusHeading(status, copy),
    stand:
      standName && (state === 'requested' || state === 'offering')
        ? localizeText(locale, standName, status.standNames)
        : undefined,
    pickup:
      state === 'scheduled' && pickupAtEpochMilliseconds !== undefined
        ? formatPickup(locale, pickupAtEpochMilliseconds)
        : undefined,
    coordinator: displayCoordinator(status, locale, copy),
    driver: isMatched(state) && matchedDriver ? mapDriver(matchedDriver, locale) : undefined,
  };
}

function isMatched(state: RiderStatusView['status']) {
  return state === 'accepted' || state === 'driver_arrived' || state === 'in_trip';
}

function mapDriver({ firstName, names, vehicleNumber, phone }: MatchedDriverView, locale: Locale) {
  const canContact = phone && INDIAN_PHONE.test(phone);
  return {
    firstName: localizeText(locale, firstName, names),
    vehicleNumber,
    callHref: canContact ? `tel:${phone}` : undefined,
    whatsappHref: canContact ? `https://wa.me/${phone.slice(1)}` : undefined,
  };
}

export function isTerminalStatus(status: RiderStatusView['status']) {
  return (
    status === 'completed' ||
    status === 'no_driver_found' ||
    status === 'cancelled_by_rider' ||
    status === 'cancelled_by_driver'
  );
}

function displayCoordinator(status: RiderStatusView, locale: Locale, copy: RiderCopy) {
  if (status.status !== 'no_driver_found') return undefined;
  return mapCoordinatorContact(
    localizeConfiguredContact(locale, status.coordinatorContact, status.coordinatorContacts),
    copy.contactUnavailable,
  );
}

function statusHeading(status: RiderStatusView, copy: RiderCopy) {
  if (status.noDriverFoundReason !== 'booking_unavailable') return copy[status.status];
  if (status.capability?.kind === 'simulated') return copy.demoRunUnavailable;
  return getAvailabilityCopy(copy, status.capability);
}
