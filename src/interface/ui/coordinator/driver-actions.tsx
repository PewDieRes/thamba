'use client';

import { useRef, useState } from 'react';
import type { CoordinatorDriver } from '@application/contracts/coordinator-dashboard-view';
import {
  postCoordinator,
  queueActions,
  type CoordinatorAction,
} from '../../routes/coordinator-command';
import type { CoordinatorCopy } from './coordinator-copy';

type ActionState =
  { phase: 'idle' } | { phase: 'pending' | 'success' | 'error'; action: CoordinatorAction };

interface DriverActionsProps {
  readonly driver: CoordinatorDriver;
  readonly standId: string;
  readonly locale: string;
  readonly copy: CoordinatorCopy;
  readonly onChange: () => void;
}

export function DriverActions({ driver, standId, locale, copy, onChange }: DriverActionsProps) {
  const [state, setState] = useState<ActionState>({ phase: 'idle' });
  const [inviteUrl, setInviteUrl] = useState<string>();
  const isRunning = useRef(false);
  async function run(action: CoordinatorAction) {
    if (isRunning.current) return;
    isRunning.current = true;
    if (action === 'invite' || action === 'revoke') setInviteUrl(undefined);
    setState({ phase: 'pending', action });
    const result = await postCoordinator(action, { driverId: driver.driverId, standId, locale });
    isRunning.current = false;
    setState({ phase: result.ok ? 'success' : 'error', action });
    if (!result.ok) return;
    if ('url' in result) setInviteUrl(result.url);
    onChange();
  }
  return (
    <>
      <div className="coordinator-actions">
        {getActions(driver).map((action) => (
          <button
            key={action}
            type="button"
            disabled={state.phase === 'pending'}
            onClick={() => void run(action)}
          >
            {copy.actions[action]}
          </button>
        ))}
      </div>
      <ActionFeedback state={state} copy={copy} />
      {inviteUrl && <InviteLink url={inviteUrl} copy={copy} />}
    </>
  );
}

function getActions({
  availability,
  hasDevice,
  canInvite,
}: CoordinatorDriver): CoordinatorAction[] {
  const queue =
    availability === 'offline'
      ? queueActions.slice(0, 1)
      : availability === 'on_trip'
        ? []
        : queueActions.slice(1);
  return [
    ...queue,
    ...(canInvite ? (['invite'] as const) : []),
    ...(hasDevice ? (['revoke'] as const) : []),
  ];
}

function ActionFeedback({ state, copy }: { state: ActionState; copy: CoordinatorCopy }) {
  if (state.phase === 'idle') return <div role="status" />;
  const message = state.phase === 'pending' ? copy.saving : copy[state.phase][state.action];
  return state.phase === 'error' ? <p role="alert">{message}</p> : <p role="status">{message}</p>;
}

function InviteLink({ url, copy }: { url: string; copy: CoordinatorCopy }) {
  return (
    <div className="coordinator-invite">
      <label>
        {copy.inviteLink}
        <input
          readOnly
          value={url}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
      </label>
      <a
        className="action"
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
      >
        {copy.whatsapp}
      </a>
    </div>
  );
}
