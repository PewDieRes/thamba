import type { RiderCopy } from './rider-copy';

export interface StatusDetails {
  heading: string;
  stand?: string | undefined;
  pickup?: string | undefined;
  coordinator?: string | undefined;
  driver?:
    | {
        firstName: string;
        vehicleNumber?: string | undefined;
        callHref?: string | undefined;
        whatsappHref?: string | undefined;
      }
    | undefined;
}

export function BookingStatus({ copy, details }: { copy: RiderCopy; details: StatusDetails }) {
  const { heading, stand, pickup, coordinator, driver } = details;
  return (
    <section className="panel" aria-labelledby="booking-progress">
      <div role="status" aria-atomic="true">
        <h2 id="booking-progress">{heading}</h2>
        {stand && <p>{stand}</p>}
        {pickup && <p>{pickup}</p>}
        {coordinator && (
          <p>
            {copy.coordinator} · {coordinator}
          </p>
        )}
        {driver && (
          <p>
            <strong>{driver.firstName}</strong>
            {driver.vehicleNumber && (
              <>
                <br />
                {copy.vehicle} · {driver.vehicleNumber}
              </>
            )}
          </p>
        )}
      </div>
      {driver && <DriverLinks copy={copy} driver={driver} />}
    </section>
  );
}

function DriverLinks({
  copy,
  driver,
}: {
  copy: RiderCopy;
  driver: NonNullable<StatusDetails['driver']>;
}) {
  if (!driver.callHref && !driver.whatsappHref) return null;
  return (
    <div className="actions">
      {driver.callHref && (
        <a className="action primary" href={driver.callHref}>
          {copy.call}
        </a>
      )}
      {driver.whatsappHref && (
        <a className="action" href={driver.whatsappHref} rel="noreferrer">
          {copy.whatsapp}
        </a>
      )}
    </div>
  );
}
