import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import en from '../../../messages/en/common.json';
import hi from '../../../messages/hi/common.json';
import mr from '../../../messages/mr/common.json';
import { routing } from './routing';

const commonMessages = { mr, en, hi } satisfies Record<(typeof routing.locales)[number], typeof mr>;

export const requestConfig = getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, requestedLocale)) notFound();

  return { locale: requestedLocale, messages: { common: commonMessages[requestedLocale] } };
});
