import { BookingNotices, type NoticeDetails } from './booking-notices';
import { CoordinatorContact, type CoordinatorContactDetails } from './coordinator-contact';
import type { ReactNode } from 'react';
import type { RiderCopy } from './rider-copy';

interface FareRow {
  id: string;
  route: string;
  day: string;
  night: string;
}
interface StandRow {
  id: string;
  name: string;
  contact: CoordinatorContactDetails;
}

interface TownOverviewProps {
  name: string;
  bookingHref?: string | undefined;
  unavailable?: string | undefined;
  fares: readonly FareRow[];
  stands: readonly StandRow[];
  notices: NoticeDetails;
  copy: RiderCopy;
  children?: ReactNode;
}

export function TownOverview({
  name,
  bookingHref,
  unavailable,
  fares,
  stands,
  notices,
  copy,
  children,
}: TownOverviewProps) {
  return (
    <>
      <h1>{name}</h1>
      {unavailable && (
        <p className="notice">
          <strong>{unavailable}</strong>
        </p>
      )}
      {bookingHref && (
        <a className="action primary" href={bookingHref}>
          {copy.book}
        </a>
      )}
      {children}
      {stands.length > 0 && <StandList stands={stands} copy={copy} />}
      {fares.length > 0 && <FareTable fares={fares} copy={copy} />}
      <BookingNotices {...notices} copy={copy} />
    </>
  );
}

function StandList({ stands, copy }: { stands: readonly StandRow[]; copy: RiderCopy }) {
  return (
    <section className="panel">
      <h2>{copy.stands}</h2>
      <ul className="stand-list">
        {stands.map(({ id, name, contact }) => (
          <li key={id}>
            <strong>{name}</strong>
            <p>
              {copy.coordinator} · <CoordinatorContact {...contact} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FareTable({ fares, copy }: { fares: readonly FareRow[]; copy: RiderCopy }) {
  return (
    <section className="panel" aria-labelledby="fixed-fares">
      <h2 id="fixed-fares">{copy.fares}</h2>
      <table className="fares" aria-labelledby="fixed-fares">
        <thead>
          <tr>
            <th scope="col">{copy.route}</th>
            <th scope="col">{copy.day}</th>
            <th scope="col">{copy.night}</th>
          </tr>
        </thead>
        <tbody>
          {fares.map(({ id, route, day, night }) => (
            <tr key={id}>
              <th scope="row">{route}</th>
              <td>{day}</td>
              <td>{night}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
