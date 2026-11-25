'use client';

import { useState } from 'react';
import type { RiderCopy } from './rider-copy';

export function ShareTownLink({
  copy,
  townHref,
}: {
  copy: RiderCopy['demoFlow'];
  townHref: string;
}) {
  const [share, setShare] = useState<{ url: string; copied: boolean }>();
  async function exposeLink() {
    const url = new URL(townHref, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setShare({ url, copied: true });
    } catch {
      setShare({ url, copied: false });
    }
  }
  return (
    <div>
      <button type="button" onClick={() => void exposeLink()}>
        {copy.share}
      </button>
      {share && (
        <label>
          {copy.link}
          <input
            readOnly
            value={share.url}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
        </label>
      )}
      {share?.copied && <p role="status">{copy.copied}</p>}
    </div>
  );
}
