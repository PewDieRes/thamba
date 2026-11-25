'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import { postRider } from '../../routes/rider-api';
import type { RiderCopy } from './rider-copy';

export function DemoComplaint({
  copy,
  townId,
  demoRunId,
}: {
  copy: RiderCopy['demoFlow'];
  townId: string;
  demoRunId: string;
}) {
  const { state, submit } = useDemoComplaint({ townId, demoRunId });
  return (
    <section className="panel" aria-labelledby="demo-complaint-title">
      <h2 id="demo-complaint-title">{copy.complaint}</h2>
      <p>{copy.instructions}</p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="demo-complaint-topic">{copy.topic}</label>
        <select id="demo-complaint-topic" name="topic" disabled={state === 'pending'}>
          <option value="fare">{copy.fare}</option>
          <option value="wait">{copy.wait}</option>
          <option value="trip">{copy.trip}</option>
        </select>
        <button disabled={state === 'pending'}>{copy.send}</button>
        {state === 'pending' && <p role="status">{copy.submitting}</p>}
        {state === 'saved' && <p role="status">{copy.saved}</p>}
        {state === 'error' && <p role="alert">{copy.complaintError}</p>}
      </form>
    </section>
  );
}

function useDemoComplaint({ townId, demoRunId }: { townId: string; demoRunId: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle');
  const request = useRef<{ topic: string; id: string } | undefined>(undefined);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'pending') return;
    const topic = new FormData(event.currentTarget).get('topic');
    if (typeof topic !== 'string') return;
    if (request.current?.topic !== topic) request.current = { topic, id: crypto.randomUUID() };
    setState('pending');
    const result = await postRider('demo-complaint', {
      townId,
      demoRunId,
      complaintId: request.current.id,
      topic,
    });
    setState(result.ok ? 'saved' : 'error');
    if (result.ok) request.current = undefined;
  }
  return { state, submit };
}
