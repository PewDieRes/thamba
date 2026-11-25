import type { DriverTripView } from '@application/contracts/driver-state-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { formatFare, localizeText } from '../../routes/rider-display.mapper';
import type { DriverCopy } from './driver-copy';

const tripActions = { accepted: 'arrive', driver_arrived: 'start', in_trip: 'complete' } as const;
export type TripAction = (typeof tripActions)[keyof typeof tripActions];

export function DriverTrip({
  trip,
  copy,
  locale,
  isBusy,
  onProgress,
}: {
  trip: DriverTripView;
  copy: DriverCopy;
  locale: Locale;
  isBusy: boolean;
  onProgress: (action: TripAction) => void;
}) {
  const action = tripActions[trip.status];
  return (
    <section className="panel driver-panel" aria-labelledby="driver-trip">
      <h2 id="driver-trip" aria-live="polite">
        {copy[trip.status]}
      </h2>
      <TripDetails trip={trip} copy={copy} locale={locale} />
      <button
        type="button"
        className="primary"
        disabled={isBusy}
        onClick={() => {
          onProgress(action);
        }}
      >
        {copy[action]}
      </button>
    </section>
  );
}

function TripDetails({
  trip,
  copy,
  locale,
}: {
  trip: DriverTripView;
  copy: DriverCopy;
  locale: Locale;
}) {
  const { destination, fareInPaise, rider } = trip;
  return (
    <>
      <dl className="driver-details">
        {destination && (
          <>
            <dt>{copy.destination}</dt>
            <dd>{localizeText(locale, destination.name, destination.names)}</dd>
          </>
        )}
        <dt>{copy.fare}</dt>
        <dd className="driver-number">{formatFare(locale, fareInPaise)}</dd>
        {rider?.firstName && (
          <>
            <dt>{copy.rider}</dt>
            <dd>{rider.firstName}</dd>
          </>
        )}
      </dl>
      {rider && (
        <a className="action" href={`tel:${rider.phone}`}>
          {copy.call}
        </a>
      )}
    </>
  );
}
