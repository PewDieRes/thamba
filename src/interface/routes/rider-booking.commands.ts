import type { FareQuoteView } from '@application/contracts/fare-quote-view';
import type { ApplicationError } from '@application/ports/application-result';
import type { RiderCopy } from '../ui/rider/rider-copy';
import { postRider } from './rider-api';
import { readRideInput, type mapRiderForm, type RideFormValues } from './rider-form.mapper';

export type FlowProps = ReturnType<typeof mapRiderForm> & {
  townName: string;
  copy: RiderCopy;
  demoRun?: (DemoRun & { templateStandId: string }) | undefined;
};
export type QuoteState = {
  quote: FareQuoteView;
  standId: string;
  pickupAt: number | undefined;
  commandKey: string;
  wasRefreshed: boolean;
};
export type DemoRun = { demoRunId: string; standId: string };
export type QuoteRetry = { fingerprint: string; key: string };
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface FareRequest {
  props: FlowProps;
  values: RideFormValues;
  runs: Map<string, DemoRun>;
  quoteRetry: { current: QuoteRetry | undefined };
}

export async function requestFare({
  props,
  values,
  runs,
  quoteRetry,
}: FareRequest): Promise<Result<QuoteState>> {
  const selection = readRideInput(values, props.stands);
  if (!selection.ok) return { ok: false, error: props.copy[selection.error] };
  const scope = await getBookingScope(runs, selection.standId, props);
  if (!scope.ok) return { ok: false, error: describeError(props.copy, scope.error) };

  const payload = { townId: props.townId, ...selection.input, ...scope.value.demoRun };
  const fingerprint = JSON.stringify(payload);
  const key =
    quoteRetry.current?.fingerprint === fingerprint ? quoteRetry.current.key : crypto.randomUUID();
  quoteRetry.current = { fingerprint, key };
  const response = await postRider<FareQuoteView>('quote', { ...payload, commandKey: key });
  if (!response.ok) return { ok: false, error: describeError(props.copy, response.error) };
  quoteRetry.current = undefined;
  return {
    ok: true,
    value: {
      quote: response.value,
      standId: scope.value.standId,
      pickupAt: selection.input.pickupAtEpochMilliseconds,
      commandKey: crypto.randomUUID(),
      wasRefreshed: false,
    },
  };
}

export async function confirmBooking(
  quote: QuoteState,
  { locale, copy }: FlowProps,
): Promise<Result<QuoteState>> {
  const response = await postRider<{ bookingId: string }>('bookings', {
    quoteId: quote.quote.quoteId,
    standId: quote.standId,
    commandKey: quote.commandKey,
    isScheduled: quote.pickupAt !== undefined,
  });
  if (response.ok) {
    window.location.assign(`/${locale}/rider/status/${response.value.bookingId}`);
    return { ok: true, value: quote };
  }
  if (response.error.code === 'stale_quote' && 'freshQuote' in response.error) {
    return {
      ok: true,
      value: {
        ...quote,
        quote: response.error.freshQuote,
        commandKey: crypto.randomUUID(),
        wasRefreshed: true,
      },
    };
  }
  return { ok: false, error: describeError(copy, response.error) };
}

async function getBookingScope(
  runs: Map<string, DemoRun>,
  standId: string,
  { isDemo, townId, demoRun }: FlowProps,
) {
  if (!isDemo) return { ok: true, value: { standId, demoRun: {} } } as const;
  let run = demoRun?.templateStandId === standId ? demoRun : runs.get(standId);
  if (!run) {
    const response = await postRider<DemoRun>('demo-run', { townId, standId });
    if (!response.ok) return response;
    run = response.value;
    runs.set(standId, run);
  }
  return {
    ok: true,
    value: { standId: run.standId, demoRun: { demoRunId: run.demoRunId } },
  } as const;
}

function describeError(copy: RiderCopy, error: ApplicationError) {
  switch (error.code) {
    case 'NO_ROUTE':
    case 'SAME_LANDMARK':
      return copy.noRoute;
    case 'TOWN_NOT_BOOKABLE':
    case 'booking_unavailable':
      return copy.bookingUnavailable;
    default:
      return copy.error;
  }
}
