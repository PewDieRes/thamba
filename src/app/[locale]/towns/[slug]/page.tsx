import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@interface/i18n/routing';
import { messages } from '@interface/i18n/messages';
import { mapTownOverview } from '@interface/routes/rider-town.mapper';
import { TownOverview } from '@ui/rider/town-overview';
import { readTownOverview } from './actions';

export default async function Page({ params, searchParams }: PageProps<'/[locale]/towns/[slug]'>) {
  const [{ locale, slug }, { from }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  const { rider: copy } = messages[locale];
  const result = await readTownOverview(slug);
  if (!result.ok) {
    if (result.error.code === 'not_found') notFound();
    return <h1>{copy.error}</h1>;
  }
  return (
    <TownOverview
      {...mapTownOverview(result.value, locale, copy, typeof from === 'string' ? from : undefined)}
    />
  );
}
