import type { CoordinatorDashboardView } from '@application/contracts/coordinator-dashboard-view';
import type { Locale } from '@application/contracts/town-overview-view';
import type { CoordinatorCopy } from './coordinator-copy';
import { DriverActions } from './driver-actions';

interface RosterProps {
  drivers: CoordinatorDashboardView['drivers'];
  names: ReadonlyMap<string, string>;
  copy: CoordinatorCopy;
  standId: string;
  locale: Locale;
  onChange: () => void;
}

export function DriverRoster(props: RosterProps) {
  const { drivers, copy } = props;
  return (
    <section aria-labelledby="driver-roster">
      <h2 id="driver-roster">{copy.drivers}</h2>
      {drivers.length ? <DriverTable {...props} /> : <p>{copy.noDrivers}</p>}
    </section>
  );
}

function DriverTable({ drivers, copy, names, ...target }: RosterProps) {
  const headers = [
    copy.name,
    copy.vehicle,
    copy.availability,
    copy.position,
    copy.tripsToday,
    copy.operations,
  ];
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={copy.drivers}>
      <table>
        <thead>
          <tr>
            {headers.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.driverId}>
              <th scope="row">{names.get(driver.driverId)}</th>
              <td>{driver.vehicleNumber ?? '—'}</td>
              <td>{copy.availabilities[driver.availability]}</td>
              <td>{driver.position ?? '—'}</td>
              <td>{driver.tripsToday}</td>
              <td>
                <DriverActions driver={driver} copy={copy} {...target} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
