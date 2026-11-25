import { getLocale, getTranslations } from 'next-intl/server';

export async function HomePage() {
  const locale = await getLocale();
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
          <a className="action" href={`/${locale}/towns/malvan`}>
            {t('malvan')}
          </a>
        </li>
      </ul>
    </>
  );
}
