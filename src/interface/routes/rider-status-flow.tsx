'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@application/contracts/town-overview-view';
import type { RiderStatusView } from '@application/contracts/rider-status-view';
import { BookingNotices } from '../ui/rider/booking-notices';
import { BookingStatus } from '../ui/rider/booking-status';
import type { RiderCopy } from '../ui/rider/rider-copy';
import { localizeContact } from './rider-display.mapper';
import { isTerminalStatus, mapRiderStatus } from './rider-status.mapper';
import { postRider } from './rider-api';

const POLL_INTERVAL_MILLISECONDS = 3_000;

interface StatusFlowProps {
  bookingId: string;
  locale: Locale;
  copy: RiderCopy;
}

type PollFailure = 'missing' | 'connection';

export function RiderStatusFlow({ bookingId, locale, copy }: StatusFlowProps) {
  const { status, failure } = useStatusPoll(bookingId);
  return (
    <>
      <h1>{copy.statusTitle}</h1>
      {status ? (
        <BookingStatus details={mapRiderStatus(status, locale, copy)} copy={copy} />
      ) : (
        <p role="status">{failure === 'missing' ? copy.missingStatus : copy.loadingStatus}</p>
      )}
      {failure === 'connection' && (
        <p className="error" role="status">
          {copy.connection}
        </p>
      )}
      <BookingNotices
        capability={status?.capability}
        grievance={localizeContact(locale, status?.grievanceContact, status?.grievanceContacts)}
        copy={copy}
      />
    </>
  );
}

function useStatusPoll(bookingId: string) {
  const [status, setStatus] = useState<RiderStatusView>();
  const [failure, setFailure] = useState<PollFailure>();
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      const startedAt = performance.now();
      const result = await postRider<RiderStatusView>('status', { bookingId }, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) {
        setStatus(result.value);
        setFailure(undefined);
        if (isTerminalStatus(result.value.status)) return;
      } else if (isMissing(result.error.code)) {
        setStatus(undefined);
        setFailure('missing');
        return;
      } else setFailure('connection');

      const delay = Math.max(0, POLL_INTERVAL_MILLISECONDS - (performance.now() - startedAt));
      timer = setTimeout(() => void poll(), delay);
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [bookingId]);

  return { status, failure };
}

function isMissing(code: string) {
  return (
    code === 'not_found' ||
    code === 'unauthenticated' ||
    code === 'forbidden' ||
    code === 'invalid_input'
  );
}
