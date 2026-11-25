import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@ui/locale-switcher';
import './layout.css';
import { routing } from '../../interface/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'common' });
  return { title: t('appName') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main-content">
          {t('skip')}
        </a>
        <header className="site-header">
          <div className="shell header-content">
            <a className="wordmark" href={`/${locale}`}>
              {t('appName')}
            </a>
            <Suspense>
              <LocaleSwitcher locale={locale} label={t('languages')} />
            </Suspense>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="shell main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
