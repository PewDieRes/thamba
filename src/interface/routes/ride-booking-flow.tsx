'use client';

import { useEffect, useRef, useState, type SubmitEventHandler } from 'react';
import type { FareQuoteView } from '@application/contracts/fare-quote-view';
import { FareQuote } from '../ui/rider/fare-quote';
import { RideForm } from '../ui/rider/ride-form';
import { BookingNotices } from '../ui/rider/booking-notices';
import { formatFare, formatPickup } from './rider-display.mapper';
import {
  requestFare,
  confirmBooking,
  type FlowProps,
  type QuoteState,
  type DemoRun,
  type QuoteRetry,
} from './rider-booking.commands';
import { filterLandmarks, type RideFormValues } from './rider-form.mapper';

export function RideBookingFlow(props: FlowProps) {
  const { copy, notices, townName, locale } = props;
  const controller = useRideBooking(props);
  const { values, quote, error, isBusy } = controller;
  useQuoteFocus(quote !== undefined);
  return (
    <>
      <h1>{copy.book}</h1>
      <p>{townName}</p>
      {quote ? (
        <FareQuote
          copy={copy}
          fare={formatFare(locale, quote.quote.fareInPaise)}
          route={describeRoute(props.landmarks, quote.quote.route)}
          pickup={quote.pickupAt === undefined ? undefined : formatPickup(locale, quote.pickupAt)}
          onEdit={controller.edit}
          onConfirm={() => void controller.confirm()}
          isBusy={isBusy}
          error={error}
          wasRefreshed={quote.wasRefreshed}
        />
      ) : (
        <RideForm
          copy={copy}
          passengerOptions={props.passengerOptions}
          values={values}
          onChange={controller.setValues}
          queries={controller.queries}
          onSearch={controller.setQueries}
          options={getOptions(props.landmarks, controller.queries, values)}
          isBusy={isBusy}
          error={error}
          onSubmit={controller.submit}
        />
      )}
      <BookingNotices {...notices} copy={copy} />
    </>
  );
}

function useQuoteFocus(hasQuote: boolean) {
  useEffect(() => {
    if (hasQuote) document.getElementById('quote-title')?.focus();
  }, [hasQuote]);
}

function useRideBooking(props: FlowProps) {
  const [values, setValues] = useState<RideFormValues>(initialValues(props.preselection));
  const [queries, setQueries] = useState({ from: '', to: '' });
  const [quote, setQuote] = useState<QuoteState>();
  const [error, setError] = useState<string>();
  const runs = useRef(new Map<string, DemoRun>());
  const quoteRetry = useRef<QuoteRetry | undefined>(undefined);
  const { isBusy, run } = usePendingCommand();
  const submit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    void run(async () => {
      setError(undefined);
      const result = await requestFare({ props, values, runs: runs.current, quoteRetry });
      if (result.ok) setQuote(result.value);
      else setError(result.error);
    });
  };
  const confirm = () =>
    run(async () => {
      if (!quote) return;
      setError(undefined);
      const result = await confirmBooking(quote, props);
      if (result.ok) setQuote(result.value);
      else setError(result.error);
    });
  const edit = () => {
    setQuote(undefined);
    setError(undefined);
  };
  return { values, setValues, queries, setQueries, quote, error, isBusy, edit, submit, confirm };
}

function initialValues(from: string): RideFormValues {
  return { from, to: '', passengers: 1, when: 'now', date: '' };
}

function usePendingCommand() {
  const [isBusy, setBusy] = useState(false);
  const busy = useRef(false);
  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busy.current = false;
      setBusy(false);
    }
  }
  return { isBusy, run };
}

function getOptions(
  options: FlowProps['landmarks'],
  queries: Pick<RideFormValues, 'from' | 'to'>,
  values: RideFormValues,
) {
  return {
    from: filterLandmarks(options, queries.from, values.from),
    to: filterLandmarks(options, queries.to, values.to),
  };
}

function describeRoute(options: FlowProps['landmarks'], route: FareQuoteView['route']) {
  const start = options.find(({ id }) => id === route.pickupLandmarkId)?.label;
  const end = options.find(({ id }) => id === route.destinationLandmarkId)?.label;
  return start && end ? `${start} → ${end}` : '';
}
