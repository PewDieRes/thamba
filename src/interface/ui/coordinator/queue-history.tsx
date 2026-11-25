import type { QueueHistoryRow } from '@application/contracts/coordinator-dashboard-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { formatPickup } from '../../routes/rider-display.mapper';
import type { CoordinatorCopy } from './coordinator-copy';

interface HistoryLabels {
  names: ReadonlyMap<string, string>;
  locale: Locale;
  copy: CoordinatorCopy;
}

export function QueueHistory({
  history,
  ...labels
}: HistoryLabels & { history: readonly QueueHistoryRow[] }) {
  const { copy } = labels;
  return (
    <section aria-labelledby="queue-history">
      <h2 id="queue-history">{copy.history}</h2>
      {history.length ? (
        <ol>
          {history.map((row) => (
            <HistoryEntry key={row.id} row={row} {...labels} />
          ))}
        </ol>
      ) : (
        <p>{copy.noHistory}</p>
      )}
    </section>
  );
}

function HistoryEntry({ row, copy, locale, names }: HistoryLabels & { row: QueueHistoryRow }) {
  return (
    <li>
      <strong>{names.get(row.driverId) ?? row.driverId}</strong>
      {' · '}
      {copy.reasons[row.reason]}
      {row.availabilityReason && row.availabilityReason !== row.reason && (
        <> · {copy.reasons[row.availabilityReason]}</>
      )}
      {' · '}
      <time dateTime={new Date(row.occurredAt).toISOString()}>
        {formatPickup(locale, row.occurredAt)}
      </time>
      <ul aria-label={copy.positionChanges}>
        {row.movements.map(({ driverId, from, to }) => (
          <li key={driverId}>
            {names.get(driverId) ?? driverId}
            {' · '}
            {from ?? copy.outOfQueue} → {to ?? copy.outOfQueue}
          </li>
        ))}
      </ul>
    </li>
  );
}
