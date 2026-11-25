import type { Locale, TownOverviewView } from '@application/contracts/town-overview-view';
import type { RiderCopy } from '../ui/rider/rider-copy';
import {
  formatFare,
  getAvailabilityCopy,
  localizeContact,
  localizeText,
  mapTownNotices,
} from './rider-display.mapper';

export function mapTownOverview(
  town: TownOverviewView,
  locale: Locale,
  copy: RiderCopy,
  from?: string,
) {
  const isBookable = town.capability.kind !== 'information_only';
  const pickup = town.landmarks.find(({ slug }) => slug === from);
  return {
    name: localizeText(locale, town.name, town.names),
    bookingHref: isBookable
      ? `/${locale}/rider/${town.slug}${pickup ? `?from=${encodeURIComponent(pickup.slug)}` : ''}`
      : undefined,
    unavailable: isBookable ? undefined : getAvailabilityCopy(copy, town.capability),
    stands: town.stands.map((stand) => ({
      id: stand.id,
      name: localizeText(locale, stand.name, stand.names),
      contact:
        localizeContact(locale, stand.coordinatorContact, stand.coordinatorContacts) ??
        copy.contactUnavailable,
    })),
    fares: mapFares(town, locale),
    notices: mapTownNotices(town, locale),
    copy,
  };
}

function mapFares(town: TownOverviewView, locale: Locale) {
  const names = new Map(
    town.landmarks.map(({ id, name, names }) => [id, localizeText(locale, name, names)]),
  );
  return town.fares.flatMap(({ route, fareInPaise, nightFareInPaise }) => {
    const fromName = names.get(route.pickupLandmarkId);
    const toName = names.get(route.destinationLandmarkId);
    if (!fromName || !toName) return [];
    return [
      {
        id: route.routeId,
        route: `${fromName} → ${toName}`,
        day: formatFare(locale, fareInPaise),
        night: formatFare(locale, nightFareInPaise),
      },
    ];
  });
}
