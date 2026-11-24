import type { MetadataRoute } from 'next';
import { routing } from '../interface/i18n/routing';
import commonMessages from '../../messages/mr/common.json';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: commonMessages.appName,
    lang: routing.defaultLocale,
    start_url: '/',
  };
}
