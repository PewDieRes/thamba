import type {
  CoordinatorBooking,
  CoordinatorDashboardView,
} from '@application/contracts/coordinator-dashboard-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { formatFare, formatPickup } from '../../routes/rider-display.mapper';
import type { CoordinatorCopy } from './coordinator-copy';

type TableProps = { locale: Locale; copy: CoordinatorCopy };

export function BookingTables({
  dashboard,
  ...labels
}: TableProps & { dashboard: CoordinatorDashboardView }) {
  const { copy } = labels;
  const live = new Map<CoordinatorBooking['status'], CoordinatorBooking[]>();
  for (const row of dashboard.liveBookings) {
    const rows = live.get(row.status) ?? [];
    rows.push(row);
    live.set(row.status, rows);
  }
  return (
    <div className="coordinator-tables">
      <section aria-labelledby="live-bookings">
        <h2 id="live-bookings">{copy.live}</h2>
        {dashboard.liveBookings.length === 0 ? (
          <p>{copy.noBookings}</p>
        ) : (
          [...live].map(([status, rows]) => (
            <BookingTable key={status} rows={rows} title={copy.statuses[status]} {...labels} />
          ))
        )}
      </section>
      <section aria-labelledby="rides-log">
        <h2 id="rides-log">{copy.rides}</h2>
        <p>
          <a href={`/api/coordinator/rides?standId=${dashboard.stand.id}`}>{copy.csv}</a>
        </p>
        {dashboard.rides.length === 0 ? (
          <p>{copy.noBookings}</p>
        ) : (
          <BookingTable rows={dashboard.rides} title={copy.rides} {...labels} />
        )}
      </section>
    </div>
  );
}

function BookingTable({
  rows,
  title,
  locale,
  copy,
}: TableProps & {
  rows: readonly CoordinatorBooking[];
  title: string;
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={title}>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.booking}</th>
            <th scope="col">{copy.status}</th>
            <th scope="col">{copy.pickup}</th>
            <th scope="col">{copy.fare}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bookingId}>
              <th scope="row">{row.bookingId}</th>
              <td>{copy.statuses[row.status]}</td>
              <td>{row.pickupAt === null ? '—' : formatPickup(locale, row.pickupAt)}</td>
              <td>{formatFare(locale, row.fareInPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
