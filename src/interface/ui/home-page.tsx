import { hasLocale } from 'next-intl';
import { messages } from '../i18n/messages';
import { routing } from '../i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';

export async function HomePage() {
  const locale = await getLocale();
  const demo =
    messages[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale].rider.demoFlow;
  const t = await getTranslations('common');
  return (
    <>
      <h1>{t('appName')}</h1>
      <h2>{t('chooseTown')}</h2>
      <ul className="town-list">
        <li>
          <a className="action primary" href={`/${locale}/towns/demo-town`}>
            {t('demoTown')}
          </a>
        </li>
        <li>
          <a className="action" href={`/${locale}/towns/demo-town#try-demo`}>
            {demo.tryDemo}
          </a>
        </li>
        <li>
          <a className="action" href={`/${locale}/towns/malvan`}>
            {t('malvan')}
          </a>
        </li>
      </ul>
    </>
  );
}
