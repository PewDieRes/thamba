import type { DriverStateView } from '@application/contracts/driver-state-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { localizeText } from '../../routes/rider-display.mapper';
import type { DriverCopy } from './driver-copy';

interface DriverDashboardProps {
  state: DriverStateView;
  copy: DriverCopy;
  locale: Locale;
  isBusy: boolean;
  onToggle: () => void;
  onRejoin: () => void;
}

export function DriverDashboard({
  state,
  copy,
  locale,
  isBusy,
  onToggle,
  onRejoin,
}: DriverDashboardProps) {
  const { needsRejoin, availability } = state;
  return (
    <section className="panel driver-panel" aria-labelledby="driver-availability">
      <h2 id="driver-availability">{copy.availability}</h2>
      <QueueDetails state={state} copy={copy} locale={locale} />
      {needsRejoin ? (
        <>
          <p role="status">{copy.completed}</p>
          <button type="button" className="primary" disabled={isBusy} onClick={onRejoin}>
            {copy.rejoin}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="primary"
          disabled={isBusy}
          onClick={onToggle}
          role="switch"
          aria-labelledby="driver-availability"
          aria-checked={availability === 'online'}
        >
          {availability === 'online' ? copy.goOffline : copy.goOnline}
        </button>
      )}
      <p className="driver-availability-status" role="status">
        {copy[availability]}
      </p>
    </section>
  );
}

function QueueDetails({
  state: { stand, queuePosition },
  copy,
  locale,
}: Pick<DriverDashboardProps, 'state' | 'copy' | 'locale'>) {
  if (!stand && queuePosition === null) return null;
  return (
    <dl className="driver-details" aria-live="polite">
      {stand && (
        <>
          <dt>{copy.stand}</dt>
          <dd>{localizeText(locale, stand.name, stand.names)}</dd>
        </>
      )}
      {queuePosition !== null && (
        <>
          <dt>{copy.queuePosition}</dt>
          <dd className="driver-number">{queuePosition}</dd>
        </>
      )}
    </dl>
  );
}
