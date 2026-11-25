import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { messages } from '@interface/i18n/messages';
import { routing } from '@interface/i18n/routing';
import { DriverFlow } from '@interface/routes/driver-flow';

export default async function DriverPage({ params }: PageProps<'/[locale]/driver'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <DriverFlow copy={messages[locale].driver.home} locale={locale} />;
}
