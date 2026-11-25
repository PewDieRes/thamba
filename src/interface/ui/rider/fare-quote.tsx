import type { RiderCopy } from './rider-copy';

interface FareQuoteProps {
  copy: RiderCopy;
  fare: string;
  route: string;
  pickup?: string | undefined;
  onConfirm: () => void;
  onEdit: () => void;
  isBusy: boolean;
  error?: string | undefined;
  wasRefreshed: boolean;
}

export function FareQuote({
  copy,
  fare,
  route,
  pickup,
  onConfirm,
  onEdit,
  isBusy,
  error,
  wasRefreshed,
}: FareQuoteProps) {
  return (
    <section className="panel" aria-labelledby="quote-title">
      <h2 id="quote-title" tabIndex={-1}>
        {copy.quoteTitle}
      </h2>
      <p className="route-summary">{route}</p>
      {pickup && <p>{pickup}</p>}
      <p className="amount">{fare}</p>
      <p>{copy.fareSource}</p>
      {wasRefreshed && <p role="status">{copy.updatedFare}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button className="primary" type="button" disabled={isBusy} onClick={onConfirm}>
          {isBusy ? copy.working : copy.confirm}
        </button>
        <button type="button" disabled={isBusy} onClick={onEdit}>
          {copy.edit}
        </button>
      </div>
    </section>
  );
}
