import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { messages } from '@interface/i18n/messages';
import { routing } from '@interface/i18n/routing';
import { CoordinatorDashboard } from '@ui/coordinator/coordinator-dashboard';
import { readCoordinatorDashboard } from './actions';
import './coordinator.css';

export const dynamic = 'force-dynamic';

export default async function CoordinatorPage({
  params,
  searchParams,
}: PageProps<'/[locale]/coordinator'>) {
  const [{ locale }, { stand }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  const { dashboard: copy } = messages[locale].coordinator;
  const result = await readCoordinatorDashboard(typeof stand === 'string' ? stand : undefined);
  return result.ok ? (
    <CoordinatorDashboard locale={locale} copy={copy} {...result.value} />
  ) : (
    <>
      <h1>{copy.title}</h1>
      <p role="alert">{copy.readError}</p>
    </>
  );
}
