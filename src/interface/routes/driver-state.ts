import { useCallback, useEffect, useRef, useState } from 'react';
import type { DriverOfferView, DriverStateView } from '@application/contracts/driver-state-view';
import { postDriver } from './driver-api';

const POLL_INTERVAL_MILLISECONDS = 3_000;

export interface ReceivedDriverOffer extends DriverOfferView {
  readonly receivedAtMilliseconds: number;
}

type DriverRead =
  | { status: 'loading' | 'disconnected' | 'sessionRequired' }
  | { status: 'ready'; state: DriverStateView; offer: ReceivedDriverOffer | null };

export function useDriverState() {
  const [view, setView] = useState<DriverRead>({ status: 'loading' });
  const read = useRef<AbortController | null>(null);

  const refresh = useCallback(async (force = true) => {
    if (read.current && !force) return;
    read.current?.abort();
    const current = new AbortController();
    read.current = current;
    const next = await readDriver(current.signal);
    if (current.signal.aborted) return;
    read.current = null;
    setView(next);
  }, []);

  useEffect(() => {
    function clearConnection() {
      read.current?.abort();
      read.current = null;
      setView({ status: 'disconnected' });
    }
    const reconnect = () => void refresh();
    const poll = setInterval(() => void refresh(false), POLL_INTERVAL_MILLISECONDS);
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', clearConnection);
    reconnect();
    return () => {
      read.current?.abort();
      read.current = null;
      clearInterval(poll);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', clearConnection);
    };
  }, [refresh]);

  return { view, refresh };
}

async function readDriver(signal: AbortSignal): Promise<DriverRead> {
  const [state, pending] = await Promise.all([
    postDriver('state', {}, signal),
    postDriver('pending-offer', { includeDisplay: true }, signal),
  ]);
  if (!state.ok) {
    const requiresSession = state.status === 401 || state.status === 403;
    return { status: requiresSession ? 'sessionRequired' : 'disconnected' };
  }
  return {
    status: 'ready',
    state: state.value,
    offer:
      !state.value.trip && pending.ok && pending.value
        ? { ...pending.value, receivedAtMilliseconds: pending.receivedAtMilliseconds }
        : null,
  };
}
