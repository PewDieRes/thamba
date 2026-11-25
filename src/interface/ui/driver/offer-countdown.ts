import { useEffect, useState } from 'react';

const MILLISECONDS_PER_SECOND = 1_000;

export function useOfferCountdown(expiresAtEpochMilliseconds: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const instant = Date.now();
      setNow(instant);
      const remaining = expiresAtEpochMilliseconds - instant;
      if (remaining > 0) {
        timer = setTimeout(tick, remaining % MILLISECONDS_PER_SECOND || MILLISECONDS_PER_SECOND);
      }
    }
    tick();
    return () => {
      clearTimeout(timer);
    };
  }, [expiresAtEpochMilliseconds]);

  return Math.max(0, Math.ceil((expiresAtEpochMilliseconds - now) / MILLISECONDS_PER_SECOND));
}
