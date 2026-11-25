'use client';

import { useEffect, useRef, useState } from 'react';

interface InviteCopy {
  confirm: string;
  confirmed: string;
  failed: string;
  missing: string;
  openHome: string;
}

export function ConfirmInvite({ copy, homeHref }: { copy: InviteCopy; homeHref: string }) {
  const invite = useRef<{ token: string; commandKey: string } | undefined>(undefined);
  const [state, setState] = useState<
    'loading' | 'ready' | 'pending' | 'confirmed' | 'failed' | 'missing'
  >('loading');

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      invite.current = { token, commandKey: window.crypto.randomUUID() };
    }
    setState(invite.current ? 'ready' : 'missing');
  }, []);

  async function confirmInvite() {
    if (!invite.current) return;
    setState('pending');
    if (await redeemInvite(invite.current)) {
      invite.current = undefined;
      setState('confirmed');
    } else {
      setState('failed');
    }
  }

  if (state === 'missing') return <p>{copy.missing}</p>;
  if (state === 'confirmed') return <ConfirmedInvite copy={copy} homeHref={homeHref} />;
  return (
    <>
      {state === 'failed' && <p role="alert">{copy.failed}</p>}
      <button
        type="button"
        disabled={state === 'pending' || state === 'loading'}
        onClick={() => void confirmInvite()}
      >
        {copy.confirm}
      </button>
    </>
  );
}

function ConfirmedInvite({ copy, homeHref }: { copy: InviteCopy; homeHref: string }) {
  return (
    <>
      <p role="status">{copy.confirmed}</p>
      <a className="action primary" href={homeHref}>
        {copy.openHome}
      </a>
    </>
  );
}

async function redeemInvite(invite: { token: string; commandKey: string }) {
  try {
    const session = await post('/api/driver/session', {});
    return session.ok && (await post('/api/driver/invite', invite)).ok;
  } catch {
    return false;
  }
}

function post(path: string, body: object) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    referrerPolicy: 'no-referrer',
  });
}
