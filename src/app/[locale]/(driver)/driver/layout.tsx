import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@interface/i18n/routing';
import { RegisterDriverWorker } from '@ui/driver/register-driver-worker';
import './driver.css';

export default async function DriverLayout({ children, params }: LayoutProps<'/[locale]/driver'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <>
      <RegisterDriverWorker locale={locale} />
      {children}
    </>
  );
}
