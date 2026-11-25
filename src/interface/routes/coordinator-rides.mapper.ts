import type { CoordinatorBooking } from '@application/contracts/coordinator-dashboard-view';

export function mapRidesCsv(rides: readonly CoordinatorBooking[]) {
  const header = 'booking_id,status,pickup_at,fare_in_paise';
  const rows = rides.map(({ bookingId, status, pickupAt, fareInPaise }) =>
    [
      bookingId,
      status,
      pickupAt === null ? '' : new Date(pickupAt).toISOString(),
      fareInPaise,
    ].join(','),
  );
  return [header, ...rows, ''].join('\r\n');
}
