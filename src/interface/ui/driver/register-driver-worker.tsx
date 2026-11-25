'use client';

import { useEffect } from 'react';
import type { Locale } from '@application/contracts/town-overview-view';

export function RegisterDriverWorker({ locale }: { locale: Locale }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/driver-worker.js', {
          scope: `/${locale}/driver`,
          updateViaCache: 'none',
        })
        .catch(() => undefined);
    }
  }, [locale]);
  return null;
}
