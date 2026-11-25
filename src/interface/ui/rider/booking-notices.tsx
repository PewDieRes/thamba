import type { TownOverviewView } from '@application/contracts/town-overview-view';
import type { RiderCopy } from './rider-copy';

export interface NoticeDetails {
  readonly capability?: TownOverviewView['capability'] | undefined;
  readonly grievance?: string | undefined;
  readonly isIllustrative?: boolean;
}

export function BookingNotices({
  capability,
  grievance,
  isIllustrative,
  copy,
}: NoticeDetails & { copy: RiderCopy }) {
  const showDemo = capability?.kind === 'simulated';
  return (
    <>
      {showDemo && <p className="notice">{copy.demo}</p>}
      {isIllustrative && !showDemo && (
        <p className="notice">
          {capability?.kind === 'information_only' ? copy.illustrative : copy.illustrativeFares}
        </p>
      )}
      {capability?.kind === 'live' && (
        <p>
          ULIN <strong>{capability.ulin}</strong>
        </p>
      )}
      <aside className="panel contact" aria-label={copy.grievance}>
        <h2>{copy.grievance}</h2>
        <p>{grievance ?? copy.contactUnavailable}</p>
      </aside>
    </>
  );
}
