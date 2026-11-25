import { useEffect, useState } from 'react';

const MILLISECONDS_PER_SECOND = 1_000;

export function useOfferCountdown(deadlineMilliseconds: number) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const instant = performance.now();
      setNow(instant);
      const remaining = deadlineMilliseconds - instant;
      if (remaining > 0) {
        const untilNextSecond = remaining % MILLISECONDS_PER_SECOND || MILLISECONDS_PER_SECOND;
        timer = setTimeout(tick, Math.ceil(untilNextSecond));
      }
    }
    tick();
    return () => {
      clearTimeout(timer);
    };
  }, [deadlineMilliseconds]);

  return Math.max(0, Math.ceil((deadlineMilliseconds - now) / MILLISECONDS_PER_SECOND));
}
