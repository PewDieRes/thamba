'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import { buildDemoRunLink } from '../../routes/demo-run-link.mapper';
import { postRider } from '../../routes/rider-api';
import type { DemoRun } from '../../routes/rider-booking.commands';
import type { RiderCopy } from './rider-copy';
import { ShareTownLink } from './share-town-link';

export function DemoStart({
  copy,
  townId,
  standId,
  bookingHref,
  townHref,
}: {
  copy: RiderCopy['demoFlow'];
  townId: string;
  standId: string;
  bookingHref: string;
  townHref: string;
}) {
  const { state, start } = useDemoStart({ townId, standId, bookingHref });
  return (
    <section className="panel" id="try-demo" aria-labelledby="demo-start-title">
      <h2 id="demo-start-title">{copy.tryDemo}</h2>
      <form onSubmit={(event) => void start(event)}>
        <label htmlFor="demo-scenario">{copy.scenario}</label>
        <select id="demo-scenario" name="scenario" disabled={state === 'pending'}>
          <option value="successful_trip">{copy.successfulTrip}</option>
          <option value="queue_exhaustion">{copy.queueExhaustion}</option>
        </select>
        <button className="primary" disabled={state === 'pending'}>
          {copy.start}
        </button>
        {state === 'pending' && <p role="status">{copy.starting}</p>}
        {state === 'error' && <p role="alert">{copy.startError}</p>}
      </form>
      <ShareTownLink copy={copy} townHref={townHref} />
    </section>
  );
}

function useDemoStart({
  townId,
  standId,
  bookingHref,
}: {
  townId: string;
  standId: string;
  bookingHref: string;
}) {
  const [state, setState] = useState<'idle' | 'pending' | 'error'>('idle');
  const pending = useRef(false);
  async function start(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setState('pending');
    const scenario = new FormData(event.currentTarget).get('scenario');
    const result = await postRider<DemoRun>('demo-run', { townId, standId, scenario });
    if (result.ok) {
      window.location.assign(buildDemoRunLink(bookingHref, result.value, standId));
      return;
    }
    pending.current = false;
    setState('error');
  }
  return { state, start };
}
