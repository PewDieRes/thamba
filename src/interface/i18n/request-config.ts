import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { messages } from './messages';
import { routing } from './routing';

export const requestConfig = getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, requestedLocale)) notFound();

  return { locale: requestedLocale, messages: messages[requestedLocale] };
});
