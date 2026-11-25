import { useRef, useState } from 'react';
import type { DriverOfferView } from '@application/contracts/driver-state-view';
import { postDriver, type DriverCommand } from './driver-api';

const UNAVAILABLE_OFFER_CODES = new Set([
  'offer_expired',
  'offer_mismatch',
  'not_found',
  'dispatch_deadline',
  'booking_unavailable',
  'driver_not_reserved',
]);

export function useDriverCommands(refresh: () => Promise<void>) {
  const isPending = useRef(false);
  const retry = useRef<{ fingerprint: string; commandKey: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [dismissedOfferId, setDismissedOfferId] = useState<DriverOfferView['offerId'] | null>(null);
  const [notice, setNotice] = useState<'error' | 'unavailable' | null>(null);

  function recordResult(command: DriverCommand, result: Awaited<ReturnType<typeof postDriver>>) {
    const isUnavailable = !result.ok && UNAVAILABLE_OFFER_CODES.has(String(result.code));
    if (command.route === 'respond' && (result.ok || isUnavailable)) {
      setDismissedOfferId(command.offerId);
    }
    if (result.ok) retry.current = null;
    else setNotice(command.route === 'respond' && isUnavailable ? 'unavailable' : 'error');
  }

  async function run(command: DriverCommand) {
    const { route, ...input } = command;
    if (isPending.current) return;
    isPending.current = true;
    setIsBusy(true);
    setNotice(null);
    const fingerprint = JSON.stringify([route, input]);
    if (retry.current?.fingerprint !== fingerprint) {
      retry.current = { fingerprint, commandKey: crypto.randomUUID() };
    }
    const result = await postDriver(route, { ...input, commandKey: retry.current.commandKey });
    recordResult(command, result);
    await refresh();
    isPending.current = false;
    setIsBusy(false);
  }

  return { isBusy, notice, run, dismissedOfferId };
}
