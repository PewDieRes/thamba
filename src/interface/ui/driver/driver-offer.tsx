import type { DriverOfferView } from '@application/contracts/driver-state-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { localizeText } from '../../routes/rider-display.mapper';
import type { DriverCopy } from './driver-copy';
import { useOfferCountdown } from './offer-countdown';

interface DriverOfferProps {
  offer: DriverOfferView;
  copy: DriverCopy;
  locale: Locale;
  isBusy: boolean;
  onRespond: (action: 'accept' | 'decline') => void;
}

export function DriverOffer({ offer, copy, locale, isBusy, onRespond }: DriverOfferProps) {
  const { expiresAtEpochMilliseconds, pickup, pickupCue, pickupCueTranslations } = offer;
  const seconds = useOfferCountdown(expiresAtEpochMilliseconds);
  if (seconds === 0) return null;
  return (
    <section className="panel driver-panel driver-offer" aria-labelledby="driver-offer">
      <h2 id="driver-offer">{copy.offer}</h2>
      <dl className="driver-details">
        {pickup && (
          <>
            <dt>{copy.pickup}</dt>
            <dd>{localizeText(locale, pickup.name, pickup.names)}</dd>
          </>
        )}
        <dt>{copy.cue}</dt>
        <dd>{localizeText(locale, pickupCue, pickupCueTranslations)}</dd>
        <dt>{copy.secondsLeft}</dt>
        <dd>
          <span className="driver-number" role="timer">
            {seconds}
          </span>
        </dd>
      </dl>
      <OfferActions copy={copy} isBusy={isBusy} onRespond={onRespond} />
    </section>
  );
}

function OfferActions({
  copy,
  isBusy,
  onRespond,
}: Pick<DriverOfferProps, 'copy' | 'isBusy' | 'onRespond'>) {
  return (
    <div className="driver-offer-actions">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => {
          onRespond('decline');
        }}
      >
        {copy.decline}
      </button>
      <button
        type="button"
        className="primary"
        disabled={isBusy}
        onClick={() => {
          onRespond('accept');
        }}
      >
        {copy.accept}
      </button>
    </div>
  );
}
