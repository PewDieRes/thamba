import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { messages } from '@interface/i18n/messages';
import { routing } from '@interface/i18n/routing';
import { RiderStatusFlow } from '@interface/routes/rider-status-flow';

const bookingIdSchema = z.uuid();

export default async function Page({ params }: PageProps<'/[locale]/rider/status/[bookingId]'>) {
  const { locale, bookingId } = await params;
  if (!hasLocale(routing.locales, locale) || !bookingIdSchema.safeParse(bookingId).success)
    notFound();
  return (
    <RiderStatusFlow
      key={bookingId}
      bookingId={bookingId}
      locale={locale}
      copy={messages[locale].rider}
    />
  );
}
