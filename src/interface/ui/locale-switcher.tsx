'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { Locale } from '@application/contracts/town-overview-view';

const languageNames = { mr: 'मराठी', hi: 'हिन्दी', en: 'English' } as const;

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const suffix = pathname.split('/').slice(2).join('/');
  return (
    <nav aria-label={label} className="languages">
      {(['mr', 'hi', 'en'] as const).map((language) => (
        <a
          key={language}
          lang={language}
          hrefLang={language}
          aria-current={language === locale ? 'page' : undefined}
          href={`/${language}${suffix ? `/${suffix}` : ''}${query ? `?${query}` : ''}`}
        >
          {languageNames[language]}
        </a>
      ))}
    </nav>
  );
}
