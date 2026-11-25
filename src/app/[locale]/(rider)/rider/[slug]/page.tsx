import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { messages } from '@interface/i18n/messages';
import { routing } from '@interface/i18n/routing';
import { RideBookingFlow } from '@interface/routes/ride-booking-flow';
import { mapRiderForm } from '@interface/routes/rider-form.mapper';
import { localizeText } from '@interface/routes/rider-display.mapper';
import { readTownOverview } from '../../../towns/[slug]/actions';

export default async function Page({ params, searchParams }: PageProps<'/[locale]/rider/[slug]'>) {
  const [{ locale, slug }, { from }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  const { rider: copy } = messages[locale];
  const result = await readTownOverview(slug);
  if (!result.ok) {
    if (result.error.code === 'not_found') notFound();
    return <h1>{copy.error}</h1>;
  }
  const town = result.value;
  if (town.capability.kind === 'information_only') redirect(`/${locale}/towns/${slug}`);
  return (
    <RideBookingFlow
      {...mapRiderForm(town, locale, typeof from === 'string' ? from : undefined)}
      townName={localizeText(locale, town.name, town.names)}
      copy={copy}
    />
  );
}
