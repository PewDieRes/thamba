'use client';

import type { DriverStateView } from '@application/contracts/driver-state-view';
import type { Locale } from '@application/contracts/town-overview-view';
import type { DriverCopy } from '../ui/driver/driver-copy';
import { DriverDashboard } from '../ui/driver/driver-dashboard';
import { DriverOffer } from '../ui/driver/driver-offer';
import { DriverTrip } from '../ui/driver/driver-trip';
import { useDriverCommands } from './driver-commands';
import { useDriverState, type ReceivedDriverOffer } from './driver-state';

export function DriverFlow({ copy, locale }: { copy: DriverCopy; locale: Locale }) {
  const { view, refresh } = useDriverState();
  const commands = useDriverCommands(refresh);
  return (
    <div className="driver">
      <h1>{copy.title}</h1>
      {commands.notice && (
        <p role="alert" className="notice">
          {copy[commands.notice]}
        </p>
      )}
      {view.status === 'ready' ? (
        <DriverWork state={view.state} offer={view.offer} context={{ copy, locale, commands }} />
      ) : (
        <p role="status">{copy[view.status]}</p>
      )}
    </div>
  );
}

interface DriverWorkProps {
  state: DriverStateView;
  offer: ReceivedDriverOffer | null;
  context: { copy: DriverCopy; locale: Locale; commands: ReturnType<typeof useDriverCommands> };
}

function DriverWork({ state, offer, context }: DriverWorkProps) {
  const { copy, locale, commands } = context;
  const { isBusy, run, dismissedOfferId } = commands;
  const { trip, driverId, availability } = state;
  const props = { copy, locale, isBusy };
  if (trip)
    return (
      <DriverTrip
        {...props}
        trip={trip}
        onProgress={(route) => {
          void run({ route, bookingId: trip.bookingId });
        }}
      />
    );
  return (
    <>
      {offer && offer.offerId !== dismissedOfferId && (
        <DriverOffer
          {...props}
          key={offer.offerId}
          offer={offer}
          onRespond={(action) => {
            void run({ route: 'respond', action, offerId: offer.offerId });
          }}
        />
      )}
      <DriverDashboard
        {...props}
        state={state}
        onToggle={() =>
          void run({ route: 'availability', driverId, isOnline: availability === 'offline' })
        }
        onRejoin={() => void run({ route: 'rejoin' })}
      />
    </>
  );
}
